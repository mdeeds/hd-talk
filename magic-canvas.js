class VisibleBounds {
  constructor(ctx) {
    const inverseMatrix = ctx.getTransform().inverse();
    this.left = inverseMatrix.e;
    this.right = inverseMatrix.a * ctx.canvas.width + inverseMatrix.e;
    this.top = inverseMatrix.f;
    this.bottom = inverseMatrix.d * ctx.canvas.height + inverseMatrix.f;
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;
  }
}

class Rect {
  constructor(x, y, width, height) {
	  this.x = x;
	  this.y = y;
    this.width = width;
    this.height = height;
    
    this.dragStartX = undefined;
    this.dragStartY = undefined;
    this.rectStartX = undefined;
    this.rectStartY = undefined;
  }

  handleEvent(eventType, canvasX, canvasY) {
    if (eventType === "mousedown") {
      this.dragStartX = canvasX;
      this.dragStartY = canvasY;
      this.rectStartX = this.x;
      this.rectStartY = this.y;
      return false;
    } else if (eventType === "mousemove") {
      if (this.dragStartX !== undefined) {
        const deltaX = Math.abs(canvasX - this.dragStartX);
        const deltaY = Math.abs(canvasY - this.dragStartY);
        if (deltaX > deltaY) {
          this.x = this.rectStartX + canvasX - this.dragStartX;
          this.y = this.rectStartY;
        } else {
          this.x = this.rectStartX;
          this.y = this.rectStartY + canvasY - this.dragStartY;
        }
      }
      return false;
    } else if (eventType == "mouseup") {
      this.dragStartX = undefined;
      this.dragStartY = undefined;
      this.rectStartX = this.x;
      this.rectStartY = this.y;
      return true;  // Trigger a new layout.
    }
  }
}

class TextRect extends Rect {
  constructor(text, x, y, width, height) {
    super(x, y, width, height);
	  this.text = text;
  }
  
  draw(ctx, visibleBounds) {
    if (this.x > visibleBounds.right ||
    this.x + this.width < visibleBounds.left ||
    this.y > visibleBounds.bottom ||
    this.y + this.height < visibleBounds.top) {
      return;
    }
    // Fill text takes the lower left corner, so we need to add the height of the box.
    ctx.fillStyle = 'black';
    ctx.fillText(this.text, this.x, this.y + this.height);
    const currentZoom = ctx.getTransform().a;
    if (currentZoom <= 1.0) {
      ctx.fillStyle = '#ddd';
      ctx.fillRect(this.x - this.height, this.y, this.height, this.height);
    } else if (currentZoom > 2.0) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2.0 / currentZoom;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }
  handleEvent(eventType, canvasX, canvasY) {
    if (eventType === "click") {
      console.log(this.text);
      return false;
    } else {
      return super.handleEvent(eventType, canvasX, canvasY);
    }
  }
}

class HLine {
  constructor(y) {
    this.y = y;
  }
 
  draw(ctx, visibleBounds) {
    const currentZoom = ctx.getTransform().a;
    ctx.fillStyle = '#bef';
    const halfHeight = 0.5 / currentZoom;
    // Calculate the canvas coordinates for the edges of the visible canvas.
    ctx.fillRect(visibleBounds.left, this.y - halfHeight, 
      visibleBounds.width, 2 * halfHeight);
  }
}


class VLine {
  constructor(x) {
    this.x = x;
  }
  draw(ctx, visibleBounds) {
    const currentZoom = ctx.getTransform().a;
    ctx.fillStyle = '#fba';
    const halfWidth = 1.0 / currentZoom;
    // Calculate the canvas coordinates for the edges of the visible canvas.
    ctx.fillRect(this.x - halfWidth, visibleBounds.top, 
      2 * halfWidth, visibleBounds.height);
  }
}


class MagicCanvas {
  constructor(canvas, dataLayer) {
    this.canvas = canvas;
    this.dataLayer = dataLayer;
    console.assert(this.dataLayer);
    
    this.ctx = this.canvas.getContext('2d');
    this._resize();

    window.addEventListener('resize', this._resize.bind(this));
    this.rects = [];
    this.rects.push(
      new TextRect('Hello, World!', 100, 100, 300, 50));
    
    this.marks = [];
    this.marks.push(new HLine(0));
    this.marks.push(new VLine(0));
    this.xOffset = 0;
    this.yOffset = 0;
    this.scale = 1;
    this._addListener();
    this._addRectListeners();
    this.draw();
  }
  
  _addRectListeners() {
	  for (const eventName of ['mousedown', 'mousemove', 'mouseup', 'mouseover', 'click']) {
		  this.canvas.addEventListener(eventName, this.handleMouseEvent.bind(this));
	  }
  }
  handleMouseEvent(event) {
		const rect = this.canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		const inverseMatrix = this.ctx.getTransform().inverse();
		const canvasX = inverseMatrix.a * mouseX + inverseMatrix.c * mouseY + inverseMatrix.e;
		const canvasY = inverseMatrix.b * mouseX + inverseMatrix.d * mouseY + inverseMatrix.f;

    let needsLayout = false;
		this.rects.forEach(rect => {
		  if (canvasY >= rect.y && canvasY <= rect.y + rect.height) {
        needsLayout |= rect.handleEvent(event.type, canvasX, canvasY);
		  }
		});
    if (needsLayout) {
      this._layout();
    }
	}
  
  _layout() {
    // Sort rects by y-position, separating positive and negative rects
    const positiveRects = this.rects.filter(rect => rect.y >= 0).sort((a, b) => a.y - b.y);
    const negativeRects = this.rects.filter(rect => rect.y < 0).sort((a, b) => b.y - a.y);

    // Position positive rects
    let currentY = 0;
    positiveRects.forEach(rect => {
      rect.y = currentY;
      currentY += rect.height;
    });

    // Position negative rects
    let currentNegativeY = 0;
    negativeRects.forEach(rect => {
      currentNegativeY -= rect.height;
      rect.y = currentNegativeY;
    });
  }

	_resize() {
		this.canvas.width = this.canvas.clientWidth;
		this.canvas.height = this.canvas.clientHeight;
		this.ctx = this.canvas.getContext('2d');
		this.ctx.font = "50px serif";
	}
  
  replaceText(text) {
	  this.rects = [];
	  // Split the text into lines
	  const lines = text.split('\n');
    // Calculate the font height
    const fontHeight = this.ctx.measureText('M').width * 1.0; // Adjust the factor as needed

    // Create a TextRect for each line
    let y = 0;
    lines.forEach((line, index) => {
      this.rects.push(
        new TextRect(line, 0, y, 
          this.ctx.measureText(line).width, fontHeight));
      y += fontHeight + 3;
    });
  }
  
  _zoomToPoint(clientX, clientY, zoom) {
 		const rect = this.canvas.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const mouseY = clientY - rect.top;   
		
		// Convert mouse coordinates to canvas coordinates
		const inverseMatrix = this.ctx.getTransform().inverse();
		const canvasX = inverseMatrix.a * mouseX + inverseMatrix.c * mouseY + inverseMatrix.e;
		const canvasY = inverseMatrix.b * mouseX + inverseMatrix.d * mouseY + inverseMatrix.f;

		// Move the context so the mouse is at the origin
		this.ctx.translate(canvasX, canvasY);
		this.ctx.scale(zoom, zoom);
		this.ctx.translate(-canvasX, -canvasY);
		
		const newMatrix = this.ctx.getTransform();
		
		this.scale = newMatrix.a;
		this.xOffset = newMatrix.e;
		this.yOffset = newMatrix.f;
  }
  
  _addListener() {
	  let previousDistance = null;
	  
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = event.deltaY;
      const scaleFactor = 1.2;
      const zoom = (delta > 0) ? 1 / scaleFactor : scaleFactor;
      
      this._zoomToPoint(event.clientX, event.clientY, zoom);
    });
    
    this.canvas.addEventListener('touchstart', (event) => {
      // Handle the start of a touch event
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      if (touch1 && touch2) {
      // Store the initial distance between the touch points
      previousDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      }
    });

    this.canvas.addEventListener('touchmove', (event) => {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      if (touch1 && touch2) {
        event.preventDefault(); // Prevent default scrolling behavior
        const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        const zoom = currentDistance / previousDistance;
        previousDistance = currentDistance;

        // Calculate the midpoint between the two touch points
        const midpointX = (touch1.clientX + touch2.clientX) / 2;
        const midpointY = (touch1.clientY + touch2.clientY) / 2;

        // Call your zoomToPoint function with the midpoint and zoom amount
        this.zoomToPoint(midpointX, midpointY, zoom);
      }
    });
  }

  draw() {
    // Reset transform to identity
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Clear the canvas with white background
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Set the transform for offset and zoom
    this.ctx.translate(this.xOffset, this.yOffset);
    this.ctx.scale(this.scale, this.scale);
    // Draw each rect
    
    const visibleBounds = new VisibleBounds(this.ctx);
    for (const rect of this.rects) {
      rect.draw(this.ctx, visibleBounds);
    }
    for(const mark of this.marks) {
      mark.draw(this.ctx, visibleBounds);
    }
	
	requestAnimationFrame(this.draw.bind(this));
  }
}
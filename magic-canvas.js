class TextRect {
  constructor(text, x, y) {
	  this.text = text;
	  this.x = x;
	  this.y = y;
  }
  
  draw(ctx) {
	ctx.fillText(this.text, this.x, this.y);
  }
 }

class MagicCanvas {
  constructor(canvas) {
	this.canvas = canvas;
	this._resize();

	window.addEventListener('resize', this._resize.bind(this));
    this.rects = [];
    this.rects.push(new TextRect('Hello, World!', 100, 100));


    this.xOffset = 0;
    this.yOffset = 0;
    this.scale = 1;
	
	this._addListener();
	
	this.draw();
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
      const fontHeight = this.ctx.measureText('M').width * 1.1; // Adjust the factor as needed

    // Create a TextRect for each line
    lines.forEach((line, index) => {
      this.rects.push(new TextRect(line, 0, index * fontHeight));
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

	this.ctx.fillStyle = 'black';
    // Draw each rect
    this.rects.forEach(rect => {
      rect.draw(this.ctx);
    });
	
	requestAnimationFrame(this.draw.bind(this));
  }
}
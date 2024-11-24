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
  
  _addListener() {
	this.canvas.addEventListener('wheel', (event) => {
		event.preventDefault();
		const delta = event.deltaY;
		const scaleFactor = 1.2;

		// Get the mouse position relative to the canvas
		const rect = this.canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;   
		
		const zoom = (delta > 0) ? 1 / scaleFactor : scaleFactor;

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
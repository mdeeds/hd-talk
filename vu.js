class AudioVisualizer {
  constructor(canvas, analyzerNode) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyzerNode = analyzerNode;
    this.bufferLength = analyzerNode.frequencyBinCount;
    this.dataArray = new Float32Array(this.bufferLength);
    this.animationId = null;
    this.imageData = this.ctx.createImageData(canvas.width, canvas.height);
    this.pixelData = this.imageData.data;
  }

  start() {
    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      this.ctx.fillStyle = 'teal';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.analyzerNode.getFloatTimeDomainData(this.dataArray);

	  for (let i = 0; i < this.pixelData.length; ++i) {
		  if (this.pixelData[i] > 0) {
			  --this.pixelData[i];
		  }
	  }

      // Center the visualization
      const canvasWidthHalf = this.canvas.width / 2;
      const canvasHeightHalf = this.canvas.height / 2;

      // Iterate over the frequency data
      for (let i = 0; i < this.bufferLength - 13; ++i) {
        const x = this.dataArray[i] * canvasWidthHalf;
        const y = this.dataArray[i+13] * canvasHeightHalf;
		const xx = Math.round(x + canvasWidthHalf);
		const yy = Math.round(y + canvasHeightHalf);
		
		if (xx < 0 || yy < 0 || xx >= this.canvas.width || yy >= this.canvas.height) { continue; }

        // Calculate the pixel index
        const pixelIndex = (yy * this.canvas.width + xx) * 4;

        // Set pixel color
        this.pixelData[pixelIndex + 0] = 255; // Red
        this.pixelData[pixelIndex + 1] = 128; // Green
        this.pixelData[pixelIndex + 2] = 64; // Blue
        this.pixelData[pixelIndex + 3] = 255; // Alpha
      }

      this.ctx.putImageData(this.imageData, 0, 0);
    };

    draw();
  }

  stop() {
    cancelAnimationFrame(this.animationId);
  }
}
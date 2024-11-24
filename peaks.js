class DataAccumulator {
  constructor() {
	// Accumulated data at 1/8 resolution
	this.minArray = new Float32Array(1024);
    this.maxArray = new Float32Array(1024);
	// Number of elements that have been used in the arrays above.
	this.length = 0;
	// If append is called with something that is not divisible by 8, the remainder
	// is saved here for next time.
	this.leftoverMin = new Float32Array(7);
	this.leftoverMax = new Float32Array(7);
	this.leftovers = 0;
	this.currentMin = Infinity;
	this.currentMax = -Infinity;
	this.subAccumulator = null;
  }
  
    _appendOne(x) {
		this._appendMinMax(x, x);
    }
	
	_appendMinMax(minX, maxX) {
		// TODO: Handle an infinite buffer.
		if (this.length > 512 * 1024 * 1024) {
			return; 
		}
	    if (this.leftovers == 7) {
			if (!this.subAccumulator) {
				this.subAccumulator = new DataAccumulator();
			}
			if (this.length >= this.minArray.length) {
				this.minArray = this.resizeArray(this.minArray);
				this.maxArray = this.resizeArray(this.maxArray);
			}
			const newMinX = Math.min(this.currentMin, minX);
			const newMaxX = Math.max(this.currentMax, maxX);
		    this.minArray[this.length] = newMinX;
		    this.maxArray[this.length] = newMaxX;
			this.subAccumulator._appendMinMax(newMinX, newMaxX);
			++this.length;
            this.leftovers = 0;
		    this.currentMin = Infinity;
			this.currentMax = -Infinity;		  
	    } else {
		  this.leftoverMin[this.leftovers] = minX;
		  this.leftoverMax[this.leftovers] = maxX;
		  ++this.leftovers;
	    }
	}

  appendArray(array) {
	  for (const x of array) {
		this._appendOne(x);
	  }
  }

  getView(start, count) {
    return {
      minArray: this.minArray.slice(start, start + count),
      maxArray: this.maxArray.slice(start, start + count)
    };
  }
	resizeArray(array) {
		const newArray = new Float32Array(2 * array.length);
		newArray.set(array);
		return newArray;
	}
}

class DataAccumulator {
  constructor() {
	// Accumulated data at 1/8 resolution
	this.minArray = new Float32Array(1024);
    this.maxArray = new Float32Array(1024);
	// Number of elements that have been used in the arrays above.
	this.length = 0;
	// If append is called with something that is not divisible by 8, the remainder
	// is saved here for next time.
	this.leftoverData = new Float32Array(7);
	this.leftovers = 0;
	this.currentMin = Infinity;
	this.currentMax = -Infinity;
  }
  
    _appendOne(x) {
	    if (this.leftovers == 7) {
			// TODO check that minArray is long enough and resize if neccessary.
			// Probably adding 10% or 1024 entries - whichever is more.
		    this.minArray[this.length] = Math.min(this.currentMin, x);
		    this.maxArray[this.length] = Math.max(this.currentMax, x);
            this.leftovers = 0;
		    this.currentMin = Infinity;
			this.currentMax = -Infinity;		  
	    } else {
		  this.leftoverData[this.leftovers] = x;
		  ++this.leftovers;
	    }
    }

  appendArray(array) {
    const reducedArray = this.reduceArray(array);

    // Resize the internal arrays
    const newLength = this.minArray.length + reducedArray.length;
    this.minArray = this.resizeArray(this.minArray, newLength);
    this.maxArray = this.resizeArray(this.maxArray, newLength);

    // Copy the reduced data into the internal arrays
    this.minArray.set(reducedArray.map(item => item.min), this.minArray.length - reducedArray.length);
    this.maxArray.set(reducedArray.map(item => item.max), this.maxArray.length - reducedArray.length);
  }

  appendMinMaxArrays(minArray, maxArray) {
    const reducedArray = this.reduceMinMaxArrays(minArray, maxArray);

    // Resize the internal arrays
    const newLength = this.minArray.length + reducedArray.length;
    this.minArray = this.resizeArray(this.minArray, newLength);
    this.maxArray = this.resizeArray(this.maxArray, newLength);

    // Copy the reduced data into the internal arrays
    this.minArray.set(reducedArray.map(item => item.min), this.minArray.length - reducedArray.length);
    this.maxArray.set(reducedArray.map(item => item.max), this.maxArray.length - reducedArray.length);
  }

  getView(start, count) {
    return {
      minArray: this.minArray.slice(start, start + count),
      maxArray: this.maxArray.slice(start, start + count)
    };
  }
  resizeArray(array, newLength) {
    const newArray = new Float32Array(newLength);
    newArray.set(array);
    return newArray;
  }
}

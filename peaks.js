const kIABufferSize = 4096;
const kReduxRate = 8;

class InfiniteArrayIterator {
	constructor(arrayView) {
		this.arrayView = arrayView;
		this.currentIndex = arrayView.firstBufferIndex;
		this.currentOffset = arrayView.firstBufferOffset;
		this.returnCount = 0;
	}
	
  next() {
    if (this.returnCount >= this.count) {
      return { done: true, value: undefined };
    }

    const buffer = this.arrayView.sourceArray.buffers[this.currentIndex];
	// If the buffer is null, it means it is a buffer of zeros.
    const value = !!buffer ? buffer[this.currentOffset] : 0;

    this.currentOffset++;
    if (this.currentOffset >= kIABufferSize) {
      this.currentIndex++;
      this.currentOffset = 0;
    }

    this.returnCount++;
    return { done: false, value };
  }
}

class InfiniteArrayView {
	constructor(sourceArray, offset, count) {
		this.sourceArray = sourceArray;
		this.firstBufferIndex = Math.floor(offset / kIABufferSize);
		this.firstBufferOffset = offset % kIABufferSize;
	}
	
	*[Symbol.iterator]() {
		return new InfiniteArrayIterator(this);
	}
}

class InfiniteArray {
  constructor() {
    this.buffers = [];
    this.maxValues = [];
    this.index = 0;
	this.bufferCount = 0;
	this.length = 0;
  }

  append(value) {
	  ++this.length;
    const currentBuffer = this.buffers[this.buffers.length - 1];

    if (!currentBuffer || this.index >= kIABufferSize) {
		// Purge before we add a new buffer so we don't purge the new one.
		if (this.bufferCount > 1024) {
		  this.purgeOldBuffers();
		}
		this.buffers.push(new Float32Array(kIABufferSize));
		++this.bufferCount;
		this.maxValues.push(0);
		this.index = 0;
    }
	const bufferIndex = this.buffers.length - 1;
    this.buffers[bufferIndex][this.index] = value;
    this.maxValues[bufferIndex] = Math.max(this.maxValues[bufferIndex], Math.abs(value));
    this.index++;
  }

	purgeOldBuffers() {
		const indices = Array.from({ length: this.buffers.length }, (_, i) => i);
		indices.sort((a, b) => this.maxValues[b] - this.maxValues[a]); // Sort in descending order
		// Purge 32 of the buffers.
		for (let i = 0; i < 32; i++) {
		  this.buffers[indices[i]] = null;
		  this.maxValues[indices[i]] = 0;
		}
	}
}

class Viewable {
  constructor (mins, maxs) {
    this.mins = mins;
    this.maxs = maxs;
  }
}

// TODO: Have DataAccumulator extend Viewable.  SampleAndPeaks should extend it too.
// Concrete implementation of getView should go in here.


class DataAccumulator extends Viewable {
  constructor() {
    super(new InfiniteArray(), new InfiniteArray());
    // Accumulated data at 1/kReduxRate resolution
    this.minArray = super.mins;
    this.maxArray = super.maxs;
    // If append is called with something that is not divisible by kReduxRate, the remainder
    // is saved here for next time.
    this.leftoverMin = new Float32Array(kReduxRate - 1);
    this.leftoverMax = new Float32Array(kReduxRate - 1);
    this.leftovers = 0;
    this.currentMin = Infinity;
    this.currentMax = -Infinity;
    this.subAccumulator = null;
    this.length = 0;
  }
  
  _appendOne(x) {
		this._appendMinMax(x, x);
  }
	
	_appendMinMax(minX, maxX) {
	    if (this.leftovers === kReduxRate - 1) {
        if (!this.subAccumulator) {
          this.subAccumulator = new DataAccumulator();
        }
        const newMinX = Math.min(this.currentMin, minX);
        const newMaxX = Math.max(this.currentMax, maxX);
        this.minArray.append(newMinX);
        this.maxArray.append(newMaxX);
        this.subAccumulator._appendMinMax(newMinX, newMaxX);
        ++this.length;
        this.leftovers = 0;
        this.currentMin = Infinity;
        this.currentMax = -Infinity;		  
	    } else {
        this.currentMin = Math.min(this.currentMin, minX);
        this.currentMax = Math.max(this.currentMax, maxX);
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
}

class SamplesAndPeaks extends Viewable {
	constructor() {
    const s = new InfiniteArray();
    super(s, s);
		this.samples = s;
		this.peaks = new DataAccumulator();
	}
	
	appendArray(array) {
		this.peaks.appendArray(array);
		for (const x of array) {
			this.samples.append(x);
		}
	}
  
  getView(offset, count, minSamples) {
    let returnSamples = count; 
    let minSource = this.samples; 
    let maxSource = this.samples; 
    while (returnSamples / kReduxRate > minSamples && this.peaks) {
      returnSamples = Math.ceil(returnSamples / kReduxRate); 
      minSource = this.peaks.minArray; 
      maxSource = this.peaks.maxArray;
    }
    const viewMin = new InfiniteArrayView(minSource, offset, returnSamples);
    const viewMax = new InfiniteArrayView(maxSource, offset, returnSamples);
    return new Viewable(viewMin, viewMax);
  }
}
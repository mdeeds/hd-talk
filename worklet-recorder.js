class WorkletRecorder extends AudioWorkletProcessor {
    first = true;

    process(inputs) {
      if (inputs.length == 0) { return; }
      const channels = inputs[0];
      if (channels.length == 0) { return; }
      const samples = channels[0];
      // Caller expects monophonic data, so only return the first channel.
      this.port.postMessage({ 
        timestamp: timestamp,
        samples: samples, 
      });
      return true;
    }
}

registerProcessor('worklet-recorder', WorkletRecorder);
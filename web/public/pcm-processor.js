class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.chunkSize = 2048;
    this.captureBuffer = new Float32Array(this.chunkSize);
    this.captureOffset = 0;

    this.playbackQueue = [];
    this.currentChunk = null;
    this.playbackOffset = 0;

    this.port.onmessage = (event) => {
      this.playbackQueue.push(event.data);
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    // 1. Capture microphone audio
    if (input) {
      let offset = 0;

      while (offset < input.length) {
        const remaining = this.chunkSize - this.captureOffset;
        const count = Math.min(remaining, input.length - offset);

        this.captureBuffer.set(
          input.subarray(offset, offset + count),
          this.captureOffset
        );

        this.captureOffset += count;
        offset += count;

        if (this.captureOffset === this.chunkSize) {
          const chunk = this.captureBuffer;

          this.captureBuffer = new Float32Array(this.chunkSize);
          this.captureOffset = 0;

          this.port.postMessage(chunk, [chunk.buffer]);
        }
      }
    }

    // 2. Play processed audio received from Python
    if (output) {
      let offset = 0;

      while (offset < output.length) {
        if (!this.currentChunk) {
          this.currentChunk = this.playbackQueue.shift() || null;
          this.playbackOffset = 0;
        }

        if (!this.currentChunk) {
          break;
        }

        const remaining =
          this.currentChunk.length - this.playbackOffset;

        const count = Math.min(remaining, output.length - offset);

        output.set(
          this.currentChunk.subarray(
            this.playbackOffset,
            this.playbackOffset + count
          ),
          offset
        );

        offset += count;
        this.playbackOffset += count;

        if (this.playbackOffset >= this.currentChunk.length) {
          this.currentChunk = null;
        }
      }
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
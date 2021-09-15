// https://gist.github.com/flpvsk/047140b31c968001dc563998f7440cc1

// Adapted with some modifications by Ben Wiley for multi-channel support, 2021

/*
A worklet for recording in sync with AudioContext.currentTime.

More info about the API:
https://developers.google.com/web/updates/2017/12/audio-worklet

How to use:

1. Serve this file from your server (e.g. put it in the "public" folder) as is.

2. Register the worklet:

    const audioContext = new AudioContext();
    audioContext.audioWorklet.addModule('path/to/recorderWorkletProcessor.js')
      .then(() => {
        // your code here
      })

3. Whenever you need to record anything, create a WorkletNode, route the 
audio into it, and schedule the values for 'isRecording' parameter:

      const recorderNode = new window.AudioWorkletNode(
        audioContext,
        'recorder-worklet'
      );

      yourSourceNode.connect(recorderNode);
      recorderNode.connect(audioContext.destination);

      recorderNode.port.onmessage = (e) => {
        if (e.data.eventType === 'data') {
          const audioChannels = e.data.audioChannels;
          // process pcm data
        }

        if (e.data.eventType === 'stop') {
          // recording has stopped
        }
      };

      recorderNode.parameters.get('isRecording').setValueAtTime(1, time);
      recorderNode.parameters.get('isRecording').setValueAtTime(
        0,
        time + duration
      );
      yourSourceNode.start(time);
      
*/

class RecorderWorkletProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'isRecording',
        defaultValue: 0,
      },
      {
        name: 'bufferSize',
        defaultValue: 2048,
      },
    ];
  }

  /**
   * @param {{ parameterData: { bufferSize: number } }} options
   */
  constructor(options) {
    super(options);
    this._bufferSize = options.parameterData.bufferSize;
    // assume up to two input channels
    this._buffers = [
      new Float32Array(this._bufferSize),
      new Float32Array(this._bufferSize),
    ];
    this._initBuffer();
    // will be reset on input
    this._channelCount = 1;
  }

  _initBuffer() {
    this._bytesWritten = 0;
  }

  _isBufferEmpty() {
    return this._bytesWritten === 0;
  }

  _isBufferFull() {
    return this._bytesWritten === this._bufferSize;
  }

  /**
   * @param {...number} samplePerChannel
   */
  _appendToBuffer(...samplePerChannel) {
    if (this._isBufferFull()) {
      this._flush();
    }
    for (let channel = 0; channel < this._channelCount; channel++) {
      this._buffers[channel][this._bytesWritten] = samplePerChannel[channel];
    }
    this._bytesWritten += 1;
  }

  _flush() {
    let buffers = this._buffers;
    if (this._bytesWritten < this._bufferSize) {
      buffers = buffers.map((buffer) => buffer.slice(0, this._bytesWritten));
    }

    this.port.postMessage({
      eventType: 'data',
      audioChannels: buffers,
    });

    this._initBuffer();
  }

  _recordingStopped() {
    this.port.postMessage({
      eventType: 'stop',
    });
  }

  /**
   * @param {Float32Array[][]} inputs
   * @param {Float32Array[][]} _outputs
   * @param {{ isRecording: Float32Array; bufferSize: Float32Array }} parameters
   * @returns {boolean}
   */
  process([input], _outputs, parameters) {
    /**
     * @type {(index: number) => boolean}
     */
    const isRecording =
      parameters.isRecording.length === 1
        ? () => Boolean(parameters.isRecording[0])
        : (index) => Boolean(parameters.isRecording[index]);
    this._channelCount = Math.min(input.length, 2);
    if (this._channelCount === 0) {
      return false;
    }
    for (let dataIndex = 0; dataIndex < input[0].length; dataIndex++) {
      const shouldRecord = isRecording(dataIndex);
      if (!shouldRecord) {
        if (!this._isBufferEmpty()) {
          this._flush();
          this._recordingStopped();
        }
        continue;
      }
      if (this._channelCount === 1) {
        this._appendToBuffer(input[0][dataIndex]);
      } else {
        this._appendToBuffer(input[0][dataIndex], input[1][dataIndex]);
      }
    }

    // let the processor die if we stopped recording
    return isRecording(input[0].length - 1);
  }
}

registerProcessor('recorder-worklet', RecorderWorkletProcessor);

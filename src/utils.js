import getWavFileHeaders from 'wav-headers';
import { WaveFile } from 'wavefile';

import { SampleContainer } from './store';
import { getSyroBindings } from './getSyroBindings';

/**
 * @param {Float32Array} array
 * @param {[number, number]} clipFrames
 */
function getClippedView(array, clipFrames) {
  const frameSizeInBytes = 4;
  const byteOffset = clipFrames[0] * frameSizeInBytes;
  const viewLength = array.length - clipFrames[0] - clipFrames[1];
  return new Float32Array(array.buffer, byteOffset, viewLength);
}

/**
 * @param {AudioBuffer} audioBuffer
 * @param {[number, number]} clipFrames
 */
export function getMonoSamplesFromAudioBuffer(audioBuffer, clipFrames) {
  const clippedLength = audioBuffer.length - clipFrames[0] - clipFrames[1];
  const samples = new Float32Array(clippedLength);
  const channels = /** @type {void[]} */ (Array(audioBuffer.numberOfChannels))
    .fill()
    .map((_, i) => getClippedView(audioBuffer.getChannelData(i), clipFrames));
  for (let i = 0; i < clippedLength; i++) {
    let monoSample = 0;
    for (let j = 0; j < channels.length; j++) {
      monoSample += channels[j][i];
    }
    monoSample /= channels.length;
    samples[i] = monoSample;
  }
  return samples;
}

/**
 * Finds most significant magnitude in array of samples.
 * @param {Float32Array} samples array of floats between -1 and 1
 * @returns {number} peak value between 0 and 1
 */
export function findSamplePeak(samples) {
  let peak = 0;
  for (const sample of samples) {
    const abs = Math.abs(sample);
    if (abs > peak) {
      peak = abs;
    }
  }
  return peak;
}

/**
 * Scales an array of samples according to a specified coefficient.
 * Note: mutates input array (no return value).
 * @param {Float32Array} samples array of floats
 * @param {number} coef float value to multiply against each sample
 */
function scaleSamples(samples, coef) {
  if (coef !== 1) {
    for (let i = 0; i < samples.length; i++) {
      samples[i] *= coef;
    }
  }
}

/**
 * Normalizes samples by adjusting max value to 1 and scaling others by same
 * coefficient. Note: mutates input array (no return value).
 * @param {Float32Array} samples array of floats between -1 and 1
 * @param {number} peakTarget float between 0 and 1
 */
function normalizeSamples(samples, peakTarget = 1) {
  const coef = peakTarget / findSamplePeak(samples);
  scaleSamples(samples, coef);
}

/**
 * Reduces precision of samples by converting them to integers of a given bit
 * depth then back to floats. Note: mutates input array (no return value).
 * @param {Float32Array} samples array of floats between -1 and 1
 * @param {number} qualityBitDepth number from 8 to 16
 */
function applyQualityBitDepthToSamples(samples, qualityBitDepth) {
  const signedMax = 2 ** (qualityBitDepth - 1);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.round(samples[i] * signedMax) / signedMax;
  }
}

/**
 * @param {Float32Array} samples
 */
function convertSamplesTo16Bit(samples) {
  const samples16 = new Int16Array(samples.length);
  const signedMax = 2 ** 15;
  for (let i = 0; i < samples.length; i++) {
    samples16[i] = samples[i] === 1 ? signedMax - 1 : signedMax * samples[i];
  }
  return samples16;
}

/**
 * @param {import('./store').SampleContainer} sampleContainer
 * @returns {Promise<{ data: Uint8Array; sampleRate: number }>}
 */
export async function convertWavTo16BitMono(sampleContainer) {
  const { qualityBitDepth, normalize, clip } = sampleContainer.metadata;
  if (
    qualityBitDepth < 8 ||
    qualityBitDepth > 16 ||
    !Number.isInteger(qualityBitDepth)
  ) {
    throw new Error(
      `Expected bit depth between 8 and 16. Received: ${qualityBitDepth}`
    );
  }
  const wavSrcAudioBuffer = await getAudioBufferForAudioFileData(
    await SampleContainer.getSourceFileData(
      sampleContainer.metadata.sourceFileId
    )
  );
  const clipFrames = /** @type {[number, number]} */ (
    clip.map((c) => c * wavSrcAudioBuffer.sampleRate)
  );
  const samples =
    wavSrcAudioBuffer.numberOfChannels === 1
      ? getClippedView(wavSrcAudioBuffer.getChannelData(0), clipFrames)
      : getMonoSamplesFromAudioBuffer(wavSrcAudioBuffer, clipFrames);
  if (normalize) {
    normalizeSamples(samples, normalize);
  }
  if (qualityBitDepth < 16) {
    applyQualityBitDepthToSamples(samples, qualityBitDepth);
  }
  const samples16 = convertSamplesTo16Bit(samples);
  const samplesByteLength = samples16.length * 2;
  /**
   * @type {Uint8Array}
   */
  const wavHeader = getWavFileHeaders({
    channels: 1,
    sampleRate: wavSrcAudioBuffer.sampleRate,
    bitDepth: 16,
    dataLength: samplesByteLength,
  });
  const wavBuffer = new Uint8Array(wavHeader.length + samplesByteLength);
  wavBuffer.set(wavHeader);
  wavBuffer.set(new Uint8Array(samples16.buffer), wavHeader.length);
  return {
    data: wavBuffer,
    sampleRate: 16,
  };
}

/**
 * @param {import('./store').SampleContainer} sampleContainer
 * @param {(progress: number) => void} onProgress
 * @returns {Promise<Uint8Array>}
 */
export async function getSampleBuffer(sampleContainer, onProgress) {
  const {
    startSampleBufferFrom16BitPcmData,
    iterateSampleBuffer,
    getSampleBufferPointer,
    getSampleBufferSize,
    getSampleBufferProgress,
    freeSampleBuffer,
    heap8Buffer,
  } = await getSyroBindings();
  const { data, sampleRate } = await convertWavTo16BitMono(sampleContainer);
  const pcmData = data.slice(44);
  const err = startSampleBufferFrom16BitPcmData(
    pcmData,
    pcmData.length,
    sampleRate,
    sampleContainer.metadata.slotNumber,
    sampleContainer.metadata.qualityBitDepth,
    sampleContainer.metadata.useCompression ? 1 : 0
  );
  if (err) {
    return Promise.reject('Failed to prepare sample buffer');
  }
  const bufferPointer = getSampleBufferPointer();
  const bufferSize = getSampleBufferSize();
  const resultView = new Uint8Array(heap8Buffer(), bufferPointer, bufferSize);
  onProgress(getSampleBufferProgress() / bufferSize);
  await /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => {
      const targetIterationTime = 10;
      // assume we're behind at the start, to avoid starting with a long frame
      let lastTime = targetIterationTime * 2;
      let lastIterationInterval = 100_000;
      requestAnimationFrame(iterate);
      function iterate() {
        if (getSampleBufferProgress() >= bufferSize) {
          resolve();
          return;
        }
        const correctionCoefficient = targetIterationTime / lastTime;
        const iterationInterval = Math.max(
          Math.round(lastIterationInterval * correctionCoefficient),
          1
        );
        const before = performance.now();
        try {
          iterateSampleBuffer(iterationInterval);
        } catch (err) {
          reject(err);
          return;
        }
        lastTime = performance.now() - before;
        if (lastTime === 0) {
          // to avoid divide-by-zero due to potential rounding in Firefox
          // https://developer.mozilla.org/en-US/docs/Web/API/Performance/now#reduced_time_precision
          lastTime = 0.5;
        }
        lastIterationInterval = iterationInterval;
        onProgress(getSampleBufferProgress() / bufferSize);
        requestAnimationFrame(iterate);
      }
    })
  );
  // save a new copy of the data before freeing the result
  const sampleBuffer = new Uint8Array(resultView);
  freeSampleBuffer();
  return sampleBuffer;
}

const SAMPLE_RATE = 31250;

/**
 * @type {AudioContext | undefined}
 */
let audioContext;

function getAudioContext() {
  return (audioContext =
    audioContext || new AudioContext({ sampleRate: SAMPLE_RATE }));
}

/**
 * @param {Uint8Array} audioFileBuffer audio file to transform into audio buffer
 * @returns {Promise<AudioBuffer>}
 */
export async function getAudioBufferForAudioFileData(audioFileBuffer) {
  // make a copy of the data (since decodeAudioData will empty the source array)
  const bufferCopy = new Uint8Array(audioFileBuffer);
  /**
   * @type {AudioBuffer}
   */
  const audioBuffer = await new Promise((resolve, reject) => {
    getAudioContext().decodeAudioData(bufferCopy.buffer, resolve, reject);
  });
  return audioBuffer;
}

/**
 * @param {AudioBuffer} audioBuffer buffer to play
 */
export function playAudioBuffer(audioBuffer) {
  const audioContext = getAudioContext();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}

/**
 * @typedef {{ device: MediaDeviceInfo; channelsAvailable: number }} AudioDeviceInfoContainer
 */

/**
 * @returns {Promise<AudioDeviceInfoContainer[]>}
 */
export async function getAudioInputDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputDevices = devices.filter(
    (device) => device.kind === 'audioinput'
  );
  return Promise.all(
    audioInputDevices.map(async (device) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        // try to grab stereo audio
        audio: { deviceId: device.deviceId, channelCount: 2 },
        video: false,
      });
      // TODO: validate this is the right way to get the channel count..
      // maybe we have to wait for data available or something else?
      const channelsAvailable = stream.getAudioTracks().length;
      return {
        device,
        channelsAvailable,
      };
    })
  );
}

/**
 * @typedef {Omit<AudioWorkletNode, 'parameters'> & {
 *   parameters: Map<'isRecording' | 'bufferSize', AudioParam>
 * }} TAudioWorkletNode
 */

/**
 * @typedef {{
 *  channelCount: number;
 *  onData: (audioChannels: Float32Array[]) => void;
 *  onFinish: () => void;
 * }} PcmRecorderNodeOptions
 */

/**
 * @type {Promise<void> | undefined}
 */
let recorderWorkletProcessorPromise;
/**
 * @param {PcmRecorderNodeOptions} options
 * @returns {Promise<{ recorderNode: TAudioWorkletNode; stop: () => void }>}
 */
async function createAudioWorkletPcmRecorderNode({ onData, onFinish }) {
  const audioContext = getAudioContext();
  recorderWorkletProcessorPromise =
    recorderWorkletProcessorPromise ||
    audioContext.audioWorklet.addModule('/recorderWorkletProcessor.js');
  await recorderWorkletProcessorPromise;
  const recorderNode = /** @type {TAudioWorkletNode} */ (
    new AudioWorkletNode(audioContext, 'recorder-worklet', {
      parameterData: {
        bufferSize: 1024,
      },
    })
  );
  recorderNode.port.onmessage = (e) => {
    if (e.data.eventType === 'data') {
      /**
       * @type {Float32Array[]}
       */
      const audioChannels = e.data.audioChannels;
      onData(audioChannels);
    }

    if (e.data.eventType === 'stop') {
      onFinish();
    }
  };
  const isRecordingParam = /** @type {AudioParam} */ (
    recorderNode.parameters.get('isRecording')
  );
  isRecordingParam.setValueAtTime(1, audioContext.currentTime);
  return {
    recorderNode,
    stop() {
      isRecordingParam.setValueAtTime(0, audioContext.currentTime);
    },
  };
}

/**
 * @param {PcmRecorderNodeOptions} options
 * @returns {{ recorderNode: ScriptProcessorNode; stop: () => void }}
 */
function createScriptProcessorPcmRecorderNode({
  channelCount,
  onData,
  onFinish,
}) {
  const audioContext = getAudioContext();
  const recorderNode = audioContext.createScriptProcessor(
    1024,
    channelCount,
    channelCount
  );
  // to be set by user if they want to stop recording before time limit reached
  let stopped = false;
  recorderNode.onaudioprocess = (e) => {
    const audioChannels = /** @type {void[]} */ (Array(channelCount))
      .fill()
      .map((_, i) => e.inputBuffer.getChannelData(i));
    onData(audioChannels);
    if (stopped) {
      onFinish();
    }
  };
  return {
    recorderNode,
    stop() {
      stopped = true;
    },
  };
}

/**
 * @param {PcmRecorderNodeOptions} options
 * @returns {Promise<{ recorderNode: AudioNode; stop: () => void }>}
 */
async function createPcmRecorderNode(options) {
  if (typeof AudioWorkletNode === 'undefined') {
    return createScriptProcessorPcmRecorderNode(options);
  }
  return await createAudioWorkletPcmRecorderNode(options);
}

/**
 * @param {{
 *   deviceId: string;
 *   channelCount: number;
 *   onStart: () => void;
 * }} options
 * @returns {Promise<{ mediaRecording: Promise<Uint8Array>; stop: () => void }>}
 */
export async function captureAudio({ deviceId, channelCount, onStart }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    // TODO: support more recording configuration options
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#properties_of_audio_tracks
    // autoGainControl, echoCancellation, latency, noiseSuppression, volume
    audio: { deviceId, channelCount, sampleRate: SAMPLE_RATE },
    video: false,
  });
  const audioContext = getAudioContext();
  const mediaStreamSourceNode = audioContext.createMediaStreamSource(stream);
  const { recorderNode, stop } = await createPcmRecorderNode({
    channelCount,
    onData,
    onFinish,
  });
  mediaStreamSourceNode.connect(recorderNode);
  recorderNode.connect(audioContext.destination);
  onStart();

  const timeLimitSeconds = 10;
  const maxSamples = timeLimitSeconds * SAMPLE_RATE;
  let samplesRecorded = 0;
  /**
   * @type {Float32Array[][]}
   */
  const recordedChunks = Array(channelCount).fill([]);

  /**
   * @param {Float32Array[]} audioChannels
   */
  function onData(audioChannels) {
    /**
     * @type {number}
     */
    let sampleCount = 0;
    for (let channel = 0; channel < channelCount; channel++) {
      const chunk = audioChannels[channel];
      const chunkSize = chunk.length;
      const chunkSliced = chunk.slice(
        0,
        Math.min(chunkSize, maxSamples - samplesRecorded)
      );
      if (!sampleCount) {
        sampleCount = chunkSliced.length;
      }
      recordedChunks[channel].push(chunkSliced);
    }
    samplesRecorded += sampleCount;
    // should never be >, but just in case we did something wrong we use >=
    if (samplesRecorded >= maxSamples) {
      onFinish();
      stop();
    }
  }

  /**
   * @type {(wavBuffer: Uint8Array) => void}
   */
  let onDone;
  /**
   * @type {(error: unknown) => void}
   */
  let onError;
  /**
   * @type {Promise<Uint8Array>}
   */
  const mediaRecording = new Promise((resolve, reject) => {
    onDone = resolve;
    onError = reject;
  });
  let finished = false;

  function onFinish() {
    if (finished) {
      return;
    }

    // create wav file
    try {
      const samples = recordedChunks.map((chunks) => {
        const merged = new Float32Array(
          chunks.reduce((len, chunk) => len + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        return merged;
      });
      const wav = new WaveFile();
      wav.fromScratch(samples.length, SAMPLE_RATE, '32f', samples);
      onDone(wav.toBuffer());
    } catch (err) {
      onError(err);
    }

    // clean up
    const tracks = stream.getTracks();
    for (const track of tracks) {
      track.stop();
    }
    recorderNode.disconnect(audioContext.destination);
    mediaStreamSourceNode.disconnect(recorderNode);
    finished = true;
  }

  return {
    stop,
    mediaRecording,
  };
}

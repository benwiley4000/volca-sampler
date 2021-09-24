import { WaveFile } from 'wavefile';

import { SAMPLE_RATE } from './constants';

/**
 * @type {AudioContext | undefined}
 */
let recordingAudioContext;

function getRecordingAudioContext() {
  return (recordingAudioContext =
    recordingAudioContext ||
    new AudioContext(
      navigator.mediaDevices.getSupportedConstraints().sampleRate
        ? { sampleRate: SAMPLE_RATE }
        : {}
    ));
}

/**
 * @typedef {{ device: { deviceId: string; label: string }; channelsAvailable: number }} AudioDeviceInfoContainer
 */

/**
 * @returns {Promise<AudioDeviceInfoContainer[]>}
 */
export async function getAudioInputDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputDevices = devices.filter(
    (device) => device.kind === 'audioinput'
  );
  /**
   * @type {AudioDeviceInfoContainer[]}
   */
  const infoContainers = [];
  for (const device of audioInputDevices) {
    const stream = await navigator.mediaDevices.getUserMedia({
      // try to grab stereo audio
      audio: { deviceId: device.deviceId, channelCount: 2 },
      video: false,
    });
    // for Firefox, which requires us to check this info after
    // permissions have been granted
    const realLabel = /** @type {MediaDeviceInfo} */ (
      (await navigator.mediaDevices.enumerateDevices()).find(
        ({ deviceId }) => device.deviceId === deviceId
      )
    ).label;
    // TODO: validate this is the right way to get the channel count..
    // maybe we have to wait for data available or something else?
    const channelsAvailable = stream.getAudioTracks().length;
    for (const track of stream.getTracks()) {
      track.stop();
    }
    infoContainers.push({
      device: { deviceId: device.deviceId, label: realLabel },
      channelsAvailable,
    });
  }
  return infoContainers;
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
  const audioContext = getRecordingAudioContext();
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
  const audioContext = getRecordingAudioContext();
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
    audio: {
      deviceId,
      channelCount,
      sampleRate: SAMPLE_RATE,
      echoCancellation: false,
      // TODO: add advanced controls for these options
      // @ts-ignore (should be in type)
      autoGainControl: false,
      noiseSuppression: false,
    },
    video: false,
  });
  const audioContext = getRecordingAudioContext();
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
  const maxSamples = timeLimitSeconds * audioContext.sampleRate;
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
      // check for out-of-bounds values and just clip them (ideally we shouldn't
      // have out-of-bounds values but this sometimes happens. by clipping them
      // we kind of force the user to deal with the input levels.)
      for (let i = 0; i < chunkSliced.length; i++) {
        if (chunkSliced[i] > 1) {
          chunkSliced[i] = 1;
        } else if (chunkSliced[i] < -1) {
          chunkSliced[i] = -1;
        }
      }
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
      wav.fromScratch(samples.length, audioContext.sampleRate, '32f', samples);
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

import getWavFileHeaders from 'wav-headers';

import {
  clampOutOfBoundsValues,
  convertSamplesTo16Bit,
  getAudioContextConstructor,
  interleaveSampleChannels,
} from './audioData.js';
import { SAMPLE_RATE } from './constants.js';

/**
 * @type {AudioContext | undefined}
 */
let recordingAudioContext;

function getRecordingAudioContext() {
  const AudioContext = getAudioContextConstructor();
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
  {
    // request dummy stream first on the first available input device. this is
    // because some platforms (like iOS) don't allow any kind of device
    // inspection until access has been given to a media stream.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }
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
    let channelsAvailable = 1;
    {
      const track = stream.getAudioTracks()[0];
      // not widely available yet according to MDN.. but at least
      // seems to work with all the latest versions of each browser
      const channelCountSetting =
        /** @type {MediaTrackSettings & { channelCount: number }} */ (
          track.getSettings()
        ).channelCount;
      if (channelCountSetting) {
        channelsAvailable = channelCountSetting;
      } else if (track.getCapabilities) {
        // we'll try this as backup if it exists since the API is older, but
        // also not supported by Firefox
        channelsAvailable =
          (track.getCapabilities().channelCount || {}).max || channelsAvailable;
      }
    }
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
    audioContext.audioWorklet.addModule('recorderWorkletProcessor.js');
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
 *   onStart: (sampleRate: number, timeLimitSeconds: number) => void;
 *   onUpdate: (floatChunksByChannel: Float32Array[]) => void;
 * }} options
 * @returns {Promise<{ mediaRecording: Promise<Uint8Array>; stop: () => void }>}
 */
export async function captureAudio({
  deviceId,
  channelCount,
  onStart,
  onUpdate,
}) {
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
  const timeLimitSeconds = 65;
  onStart(audioContext.sampleRate, timeLimitSeconds);

  const maxSamples = timeLimitSeconds * audioContext.sampleRate;
  let samplesRecorded = 0;
  /**
   * @type {Int16Array[]}
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
    /**
     * @type {Float32Array[]}
     */
    const floatChunksByChannel = [];
    for (let channel = 0; channel < channelCount; channel++) {
      const chunk = audioChannels[channel];
      const chunkSize = chunk.length;
      const chunkSliced = chunk.slice(
        0,
        Math.min(chunkSize, maxSamples - samplesRecorded)
      );
      clampOutOfBoundsValues(chunkSliced);
      if (!sampleCount) {
        sampleCount = chunkSliced.length;
      }
      floatChunksByChannel.push(chunkSliced);
    }
    const interleaved = interleaveSampleChannels(floatChunksByChannel);
    const interleaved16 = convertSamplesTo16Bit(interleaved);
    recordedChunks.push(interleaved16);
    samplesRecorded += sampleCount;
    // should never be >, but just in case we did something wrong we use >=
    if (samplesRecorded >= maxSamples) {
      stop();
    }
    onUpdate(floatChunksByChannel);
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

  async function onFinish() {
    if (finished) {
      return;
    }

    // create wav file
    try {
      const blob = new Blob(recordedChunks);
      const arrayBuffer = await blob.arrayBuffer();
      const samplesInterleaved16 = new Float32Array(arrayBuffer);
      const wavHeader = getWavFileHeaders({
        channels: channelCount,
        sampleRate: audioContext.sampleRate,
        bitDepth: 16,
        dataLength: samplesInterleaved16.byteLength,
      });
      const wavBuffer = new Uint8Array(
        wavHeader.length + samplesInterleaved16.byteLength
      );
      wavBuffer.set(wavHeader);
      wavBuffer.set(
        new Uint8Array(samplesInterleaved16.buffer),
        wavHeader.length
      );
      onDone(wavBuffer);
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

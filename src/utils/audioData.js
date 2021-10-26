import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import getWavFileHeaders from 'wav-headers';

import { SampleContainer } from '../store.js';
import { SAMPLE_RATE } from './constants.js';

/**
 * @param {Float32Array} array
 * @param {[number, number]} trimFrames
 */
export function getTrimmedView(array, trimFrames) {
  const frameSizeInBytes = 4;
  const byteOffset = trimFrames[0] * frameSizeInBytes;
  const viewLength = array.length - trimFrames[0] - trimFrames[1];
  return new Float32Array(array.buffer, byteOffset, viewLength);
}

/**
 * @param {AudioBuffer} audioBuffer
 * @param {[number, number]} trimFrames
 */
export function getMonoSamplesFromAudioBuffer(audioBuffer, trimFrames) {
  const trimmedLength = audioBuffer.length - trimFrames[0] - trimFrames[1];
  const samples = new Float32Array(trimmedLength);
  const channels = /** @type {void[]} */ (Array(audioBuffer.numberOfChannels))
    .fill()
    .map((_, i) => getTrimmedView(audioBuffer.getChannelData(i), trimFrames));
  for (let i = 0; i < trimmedLength; i++) {
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
 * Check for values greater than 1 or less than -1 and just clamp them (ideally
 * we shouldn't have out-of-bounds samples but this sometimes happens.. by
 * clamping them we kind of force the user to deal with the input levels).
 * Note: mutates input array (no return value).
 * @param {Float32Array} samples array of floats
 */
export function clampOutOfBoundsValues(samples) {
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] > 1) {
      samples[i] = 1;
    } else if (samples[i] < -1) {
      samples[i] = -1;
    }
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

export function getAudioContextConstructor() {
  /**
   * @typedef {typeof window.AudioContext} AudioContextConstructor
   */
  const AudioContext =
    window.AudioContext ||
    /**
     * @type {typeof window & {
     *   webkitAudioContext: AudioContextConstructor;
     * }}
     */ (window).webkitAudioContext;
  return AudioContext;
}

/**
 * @type {AudioContext | undefined}
 */
let targetAudioContext;

function getTargetAudioContext() {
  const AudioContext = getAudioContextConstructor();
  return (targetAudioContext =
    targetAudioContext || new AudioContext({ sampleRate: SAMPLE_RATE }));
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
    getTargetAudioContext().decodeAudioData(bufferCopy.buffer, resolve, reject);
  });
  return audioBuffer;
}

/**
 * @param {string} sourceFileId sourceFileId to grab from store
 * @param {boolean} shouldClampValues do we need to clamp out of bounds values
 * @returns {Promise<AudioBuffer>}
 */
export async function getSourceAudioBuffer(sourceFileId, shouldClampValues) {
  const sourceFileData = await SampleContainer.getSourceFileData(sourceFileId);
  const audioBuffer = await getAudioBufferForAudioFileData(sourceFileData);
  if (shouldClampValues) {
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      clampOutOfBoundsValues(audioBuffer.getChannelData(channel));
    }
  }
  return audioBuffer;
}

/**
 * Given sample container, returns a 16-bit mono wav file with the sample's
 * metadata parameters applied
 * @param {import('../store').SampleContainer} sampleContainer
 * @returns {Promise<{ data: Uint8Array; sampleRate: number }>}
 */
export async function getTargetWavForSample(sampleContainer) {
  const {
    qualityBitDepth,
    sourceFileId,
    userFileInfo,
    scaleCoefficient,
    trim: { frames: trimFrames },
  } = sampleContainer.metadata;
  if (
    qualityBitDepth < 8 ||
    qualityBitDepth > 16 ||
    !Number.isInteger(qualityBitDepth)
  ) {
    throw new Error(
      `Expected bit depth between 8 and 16. Received: ${qualityBitDepth}`
    );
  }
  const sourceAudioBuffer = await getSourceAudioBuffer(
    sourceFileId,
    Boolean(userFileInfo)
  );
  const samples =
    sourceAudioBuffer.numberOfChannels === 1
      ? getTrimmedView(sourceAudioBuffer.getChannelData(0), trimFrames)
      : getMonoSamplesFromAudioBuffer(sourceAudioBuffer, trimFrames);
  if (scaleCoefficient !== 1) {
    scaleSamples(samples, scaleCoefficient);
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
    sampleRate: sourceAudioBuffer.sampleRate,
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

const audioPlaybackContextDefaultValue = {
  /**
   * @param {AudioBuffer} audioBuffer buffer to play
   * @param {{
   *   onTimeUpdate?: (currentTime: number) => void;
   *   onEnded?: () => void;
   * }} [opts]
   * @returns {() => void} stop
   */
  playAudioBuffer(audioBuffer, opts) {
    throw new Error('Must render AudioPlaybackContextProvider');
  },
  isAudioBusy: false,
};

const AudioPlaybackContext = createContext(audioPlaybackContextDefaultValue);

/**
 * @param {React.PropsWithChildren<{}>} props
 * @returns
 */
export function AudioPlaybackContextProvider({ children }) {
  const [isAudioBusy, setIsAudioBusy] = useState(false);

  const playAudioBuffer = useCallback(
    /**
     * @type {(typeof audioPlaybackContextDefaultValue.playAudioBuffer)}
     */
    (audioBuffer, { onTimeUpdate = () => null, onEnded = () => null } = {}) => {
      if (isAudioBusy) {
        throw new Error(
          'Wait until audio playback has finished to start new playback'
        );
      }
      setIsAudioBusy(true);
      /**
       * @type {AudioContext}
       */
      let audioContext;
      /**
       * @type {AudioBufferSourceNode}
       */
      let source;
      try {
        audioContext = getTargetAudioContext();
        source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      } catch (err) {
        setIsAudioBusy(false);
        throw err;
      }
      const startTime = audioContext.currentTime;
      onTimeUpdate(0);
      let frame = requestAnimationFrame(updateCurrentTime);
      function updateCurrentTime() {
        onTimeUpdate(audioContext.currentTime - startTime);
        frame = requestAnimationFrame(updateCurrentTime);
      }
      let stopped = false;
      source.addEventListener('ended', () => {
        if (!stopped) {
          onTimeUpdate(audioBuffer.duration);
          onEnded();
        }
        setIsAudioBusy(false);
        cancelAnimationFrame(frame);
      });
      return function stop() {
        source.stop();
        stopped = true;
      };
    },
    [isAudioBusy]
  );

  const contextValue = useMemo(
    () => ({
      playAudioBuffer,
      isAudioBusy,
    }),
    [playAudioBuffer, isAudioBusy]
  );

  return createElement(
    AudioPlaybackContext.Provider,
    { value: contextValue },
    children
  );
}

export function useAudioPlaybackContext() {
  return useContext(AudioPlaybackContext);
}

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import getWavFileHeaders from 'wav-headers';
import { resample } from 'wave-resampler';

import { SampleContainer } from '../store.js';
import { SAMPLE_RATE } from './constants.js';
import { userOS } from './os.js';
import { PluginError, getPlugin } from './plugins.js';
import { WAVEFORM_CACHED_WIDTH, getPeaksForSamples } from './waveform.js';

/**
 * @param {Float32Array} array
 * @param {[number, number]} trimFrames
 */
export function getTrimmedView(array, trimFrames) {
  const safeTrimFrames = /** @type {typeof trimFrames} */ (
    trimFrames.map((t) => Math.max(t, 0))
  );
  if (safeTrimFrames[0] + safeTrimFrames[1] >= array.length) {
    // return array of length 1 if there won't be any audio left
    return new Float32Array(1);
  }
  const frameSizeInBytes = 4;
  const byteOffset = array.byteOffset + safeTrimFrames[0] * frameSizeInBytes;
  const viewLength = array.length - safeTrimFrames[0] - safeTrimFrames[1];
  return new Float32Array(array.buffer, byteOffset, viewLength);
}

/**
 * @param {AudioBuffer} audioBuffer
 * @param {[number, number]} trimFrames
 * @param {Float32Array} [suppliedSampleArray]
 */
export function getMonoSamplesFromAudioBuffer(
  audioBuffer,
  trimFrames,
  suppliedSampleArray
) {
  const safeTrimFrames = /** @type {typeof trimFrames} */ (
    trimFrames.map((t) => Math.max(t, 0))
  );
  const trimmedLength =
    audioBuffer.length - safeTrimFrames[0] - safeTrimFrames[1];
  const samples = suppliedSampleArray || new Float32Array(trimmedLength);
  const channels = /** @type {void[]} */ (Array(audioBuffer.numberOfChannels))
    .fill()
    .map((_, i) =>
      getTrimmedView(audioBuffer.getChannelData(i), safeTrimFrames)
    );
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
 * Normalizes an array of samples so the peak value is 1 or -1.
 * Note: mutates input array (no return value).
 * @param {Float32Array} samples array of floats
 * @returns {number} peak
 */
function normalizeSamples(samples) {
  const peak = findSamplePeak(samples);
  scaleSamples(samples, 1 / peak);
  return peak;
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
 * @param {Float32Array[]} sampleChannels
 * @returns {Float32Array}
 */
export function interleaveSampleChannels(sampleChannels) {
  const channelCount = sampleChannels.length;
  const sampleCount = sampleChannels[0].length;
  const interleaved = new Float32Array(channelCount * sampleCount);
  for (
    let samplepluginIndex = 0;
    samplepluginIndex < interleaved.length;
    samplepluginIndex++
  ) {
    const i = channelCount * samplepluginIndex;
    for (let ch = 0; ch < channelCount; ch++) {
      interleaved[i + ch] = sampleChannels[ch][samplepluginIndex];
    }
  }
  return interleaved;
}

/**
 * @param {Float32Array} samples
 */
export function convertSamplesTo16Bit(samples) {
  const samples16 = new Int16Array(samples.length);
  const signedMax = 2 ** 15;
  for (let i = 0; i < samples.length; i++) {
    samples16[i] = Math.max(
      Math.min(signedMax - 1, signedMax * samples[i]),
      -signedMax
    );
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

export class PluginRunError extends Error {
  /**
   * @param {string} message
   * @param {number} pluginIndex
   */
  constructor(message, pluginIndex) {
    super(message);
    this.pluginIndex = pluginIndex;
  }
}

/**
 * @type {WeakMap<
 *   import('../store.js').PluginClientSpec[],
 *   Promise<AudioBuffer>
 * >}
 */
const pluginProcessingPromises = new WeakMap();

/**
 * Given sample container, returns a mono audio buffer with plugins applied
 * @param {import('../store').SampleContainer} sampleContainer
 * @returns {Promise<AudioBuffer>}
 */
export async function processPluginsForSample(sampleContainer) {
  {
    const promise = pluginProcessingPromises.get(
      sampleContainer.metadata.plugins
    );
    if (promise) return promise;
  }
  const promise = (async () => {
    const { sourceFileId, userFileInfo, plugins } = sampleContainer.metadata;
    const sourceAudioBuffer = await getSourceAudioBuffer(
      sourceFileId,
      Boolean(userFileInfo)
    );
    /** @type {AudioBuffer} */
    let monoAudioBuffer;
    if (sourceAudioBuffer.numberOfChannels === 1) {
      monoAudioBuffer = sourceAudioBuffer;
    } else {
      monoAudioBuffer = new AudioBuffer({
        length: sourceAudioBuffer.length,
        sampleRate: sourceAudioBuffer.sampleRate,
        numberOfChannels: 1,
      });
      getMonoSamplesFromAudioBuffer(
        sourceAudioBuffer,
        [0, 0],
        monoAudioBuffer.getChannelData(0)
      );
    }

    let postPluginBuffer = monoAudioBuffer;
    let i = 0;
    for (const { pluginName, pluginParams, isBypassed } of plugins) {
      if (!isBypassed) {
        const plugin = getPlugin(pluginName);
        try {
          postPluginBuffer = await plugin.sampleTransform(
            postPluginBuffer,
            pluginParams
          );
        } catch (err) {
          if (err instanceof PluginError) {
            throw new PluginRunError(
              err && err instanceof Error && err.message
                ? err.message
                : 'Plugin failed',
              i
            );
          } else {
            throw err;
          }
        }
      }
      i++;
    }

    return postPluginBuffer;
  })();
  pluginProcessingPromises.set(sampleContainer.metadata.plugins, promise);
  /** @type {AudioBuffer} */
  let postPluginBuffer;
  try {
    postPluginBuffer = await promise;
  } finally {
    // release promise after reasonable timeout to free the data from memory
    setTimeout(() => {
      pluginProcessingPromises.delete(sampleContainer.metadata.plugins);
    }, 100);
  }
  return postPluginBuffer;
}

/**
 * @type {WeakMap<
 *   import('../store').SampleContainer,
 *   ReturnType<typeof getTargetWavForPluginProcessedSample>
 * >}
 */
const targetWavProcessingPromises = new WeakMap();

/**
 * Given sample container, returns a 16-bit mono wav file with the sample's
 * metadata parameters applied
 * @param {import('../store').SampleContainer} sampleContainer
 * @param {AudioBuffer} pluginProcessedAudioBuffer
 * @param {boolean} [forPreview]
 * @returns {Promise<{
 *   data: Uint8Array;
 *   sampleRate: number;
 *   cachedInfo: import('../sampleCacheStore').CachedInfo;
 * }>}
 */
export async function getTargetWavForPluginProcessedSample(
  sampleContainer,
  pluginProcessedAudioBuffer,
  forPreview
) {
  if (forPreview) {
    const promise = targetWavProcessingPromises.get(sampleContainer);
    if (promise) return promise;
  }
  const promise = (async () => {
    const {
      qualityBitDepth,
      normalize,
      trim: { frames: trimFrames },
      pitchAdjustment,
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

    const samplesPreNormalize =
      normalize === 'all'
        ? pluginProcessedAudioBuffer.getChannelData(0)
        : getTrimmedView(
            pluginProcessedAudioBuffer.getChannelData(0),
            trimFrames
          );
    if (normalize === 'all') {
      normalizeSamples(samplesPreNormalize);
    }
    const samples =
      normalize === 'all'
        ? getTrimmedView(samplesPreNormalize, trimFrames)
        : samplesPreNormalize;
    if (normalize === 'selection') {
      normalizeSamples(samples);
    }

    const waveformPeaks = getPeaksForSamples(samples, WAVEFORM_CACHED_WIDTH);

    // for now we don't support pitch adjustments out of these bounds
    const hasValidPitchAdjustment =
      !isNaN(pitchAdjustment) &&
      pitchAdjustment !== 1 &&
      pitchAdjustment >= 0.5 &&
      pitchAdjustment <= 2;
    const pitchAdjustedSamples = hasValidPitchAdjustment
      ? new Float32Array(
          resample(
            samples,
            SAMPLE_RATE,
            Math.round(SAMPLE_RATE / pitchAdjustment)
          )
        )
      : samples;

    if (forPreview && qualityBitDepth < 16) {
      applyQualityBitDepthToSamples(pitchAdjustedSamples, qualityBitDepth);
    }

    const samples16 = convertSamplesTo16Bit(pitchAdjustedSamples);
    const samplesByteLength = samples16.length * 2;
    /**
     * @type {Uint8Array}
     */
    const wavHeader = getWavFileHeaders({
      channels: 1,
      sampleRate: pluginProcessedAudioBuffer.sampleRate,
      bitDepth: 16,
      dataLength: samplesByteLength,
    });
    const wavBuffer = new Uint8Array(wavHeader.length + samplesByteLength);
    wavBuffer.set(wavHeader);
    wavBuffer.set(new Uint8Array(samples16.buffer), wavHeader.length);
    return {
      data: wavBuffer,
      sampleRate: 16,
      cachedInfo: {
        waveformPeaks,
        postPluginFrameCount: pluginProcessedAudioBuffer.length,
        duration: samples16.length / pluginProcessedAudioBuffer.sampleRate,
        failedPluginIndex: -1,
      },
    };
  })();
  if (forPreview) {
    targetWavProcessingPromises.set(sampleContainer, promise);
  }
  /**
   * @type {Awaited<ReturnType<typeof getTargetWavForPluginProcessedSample>>}
   */
  let result;
  try {
    result = await promise;
  } finally {
    if (forPreview) {
      // release promise after reasonable timeout to free the data from memory
      setTimeout(() => {
        targetWavProcessingPromises.delete(sampleContainer);
      }, 100);
    }
  }
  return result;
}

/**
 * Given sample container, returns a 16-bit mono wav file with the sample's
 * metadata parameters applied
 * @param {import('../store').SampleContainer} sampleContainer
 * @param {boolean} [forPreview]
 * @returns {Promise<{
 *   data: Uint8Array;
 *   sampleRate: number;
 *   cachedInfo: import('../sampleCacheStore').CachedInfo;
 * }>}
 */
export async function getTargetWavForSample(sampleContainer, forPreview) {
  const pluginProcessedAudioBuffer = await processPluginsForSample(
    sampleContainer
  );
  return getTargetWavForPluginProcessedSample(
    sampleContainer,
    pluginProcessedAudioBuffer,
    forPreview
  );
}

/**
 * Silent audio to play during Web Audio playback to make iOS force Web Audio to
 * even if the mute (do not disturb) setting is on.
 * Adapted from https://github.com/swevans/unmute
 */
function createSilentAudioElement() {
  if (userOS !== 'ios') {
    // we won't use this if not on iOS so don't bother
    return document.createElement('audio');
  }

  /**
   * A utility function for decompressing the base64 silence string. A poor-mans implementation of huffman decoding.
   * @param {number} count
   * @param {string} repeatStr
   * @returns
   */
  function huffman(count, repeatStr) {
    let e = repeatStr;
    for (; count > 1; count--) e += repeatStr;
    return e;
  }

  /**
   * A very short bit of silence to be played with <audio>, which forces
   * AudioContext onto the ringer channel.
   * NOTE: The silence MP3 must be high quality, when web audio sounds are
   * played in parallel the web audio sound is mixed to match the bitrate of the
   * html sound.
   * This file is 0.01 seconds of silence VBR220-260 Joint Stereo 859B
   * The str below is a "compressed" version using poor mans huffman encoding,
   * saves about 0.5kb
   */
  const silence =
    'data:audio/mpeg;base64,//uQx' +
    huffman(23, 'A') +
    'WGluZwAAAA8AAAACAAACcQCA' +
    huffman(16, 'gICA') +
    huffman(66, '/') +
    '8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkI' +
    huffman(320, 'A') +
    '//sQxAADgnABGiAAQBCqgCRMAAgEAH' +
    huffman(15, '/') +
    '7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq' +
    huffman(18, '/') +
    '9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAw' +
    huffman(97, 'V') +
    'Q==';

  const tempElement = document.createElement('div');
  // Airplay like controls on other devices, prevents casting of the tag,
  // doesn't work on modern iOS
  tempElement.innerHTML = "<audio x-webkit-airplay='deny'></audio>";
  const audioElement = /** @type {HTMLAudioElement} */ (
    tempElement.children.item(0)
  );
  audioElement.controls = false;
  // Airplay like controls on other devices, prevents casting of the tag,
  // doesn't work on modern iOS
  audioElement.disableRemotePlayback = true;
  audioElement.preload = 'auto';
  audioElement.src = silence;
  audioElement.loop = true;
  audioElement.load();

  return audioElement;
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
  /**
   * @returns {void}
   */
  iOSPrepareForAudio() {
    throw new Error('Must render AudioPlaybackContextProvider');
  },
};

const AudioPlaybackContext = createContext(audioPlaybackContextDefaultValue);

/**
 * @param {React.PropsWithChildren<{}>} props
 * @returns
 */
export function AudioPlaybackContextProvider({ children }) {
  const [silentAudioElement] = useState(createSilentAudioElement);

  const stopCurrent = useRef(
    /** @param {boolean} [stoppedForNewAudio] */ (stoppedForNewAudio) => {}
  );

  const playAudioBuffer = useCallback(
    /**
     * @type {(typeof audioPlaybackContextDefaultValue.playAudioBuffer)}
     * @return {() => void}
     */
    (audioBuffer, { onTimeUpdate = () => null, onEnded = () => null } = {}) => {
      stopCurrent.current(true);
      const audioContext = getTargetAudioContext();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      let frame = 0;
      function startPlayback() {
        source.start();
        const startTime = audioContext.currentTime;
        onTimeUpdate(0);
        frame = requestAnimationFrame(updateCurrentTime);
        function updateCurrentTime() {
          onTimeUpdate(audioContext.currentTime - startTime);
          frame = requestAnimationFrame(updateCurrentTime);
        }
      }
      if (userOS === 'ios') {
        silentAudioElement.play().then(startPlayback);
      } else {
        startPlayback();
      }
      let stopped = false;
      /** @type {typeof stopCurrent.current} */
      function handleEnded(stoppedForNewAudio) {
        onEnded();
        if (!stoppedForNewAudio && userOS === 'ios') {
          silentAudioElement.pause();
        }
      }
      source.addEventListener('ended', () => {
        if (!stopped) {
          onTimeUpdate(audioBuffer.duration);
          handleEnded();
        }
        cancelAnimationFrame(frame);
      });
      /** @type {typeof stopCurrent.current} */
      function stop(stoppedForNewAudio) {
        if (!stopped) {
          source.stop();
          cancelAnimationFrame(frame);
          handleEnded(stoppedForNewAudio);
          stopped = true;
        }
      }
      stopCurrent.current = stop;
      return stop;
    },
    [silentAudioElement]
  );

  const iOSPrepareForAudio = useCallback(() => {
    silentAudioElement.play();
  }, [silentAudioElement]);

  const contextValue = useMemo(
    () => ({
      playAudioBuffer,
      iOSPrepareForAudio,
    }),
    [playAudioBuffer, iOSPrepareForAudio]
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

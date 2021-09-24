import getWavFileHeaders from 'wav-headers';

import { SampleContainer } from '../store';
import { SAMPLE_RATE } from './constants';

/**
 * @param {AudioBuffer} sourceAudioBuffer
 * @returns {Promise<AudioBuffer>}
 */
async function resampleToTargetSampleRate(sourceAudioBuffer) {
  if (sourceAudioBuffer.sampleRate === SAMPLE_RATE) {
    return sourceAudioBuffer;
  }
  const ratio = SAMPLE_RATE / sourceAudioBuffer.sampleRate;
  const offlineContext = new OfflineAudioContext(
    sourceAudioBuffer.numberOfChannels,
    sourceAudioBuffer.length * ratio,
    SAMPLE_RATE
  );
  const offlineSource = offlineContext.createBufferSource();
  offlineSource.buffer = sourceAudioBuffer;
  offlineSource.connect(offlineContext.destination);
  offlineSource.start();
  const audioBufferResampled = await offlineContext.startRendering();
  return audioBufferResampled;
}

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
 * @type {AudioContext | undefined}
 */
let targetAudioContext;

function getTargetAudioContext() {
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
 * @param {import('../store').SampleContainer} sampleContainer
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
  const wavSrcAudioBuffer = await resampleToTargetSampleRate(
    await getAudioBufferForAudioFileData(
      await SampleContainer.getSourceFileData(
        sampleContainer.metadata.sourceFileId
      )
    )
  );
  const clipFrames = /** @type {[number, number]} */ (
    clip.map((c) => Math.round(c * wavSrcAudioBuffer.sampleRate))
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

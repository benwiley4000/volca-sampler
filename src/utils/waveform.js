import {
  getMonoSamplesFromAudioBuffer,
  getSourceAudioBuffer,
} from './audioData.js';

export const GROUP_PIXEL_WIDTH = 6;

export const WAVEFORM_CACHED_WIDTH = GROUP_PIXEL_WIDTH * 44; // 264

/**
 * @typedef {{ positive: Float32Array; negative: Float32Array }} SamplePeaks
 */

/**
 * @param {Float32Array} samples an array of floats from -1 to 1
 * @param {number} containerPixelWidth the size of the waveform container
 * @returns {SamplePeaks} arrays of peak positive and negative values
 */
export function getPeaksForSamples(samples, containerPixelWidth) {
  // the number of samples represented for each peak
  const groupSize = Math.floor(
    (GROUP_PIXEL_WIDTH * samples.length) / containerPixelWidth
  );
  // Cut off whatever's left after dividing into blocks of length [groupSize]
  const positive = new Float32Array(Math.floor(samples.length / groupSize));
  const negative = new Float32Array(Math.floor(samples.length / groupSize));
  for (let i = 0; i < positive.length; i++) {
    const group = new Float32Array(
      samples.buffer,
      i * groupSize * 4,
      groupSize
    );
    let max = 0;
    let min = 0;
    for (const sample of group) {
      if (sample > max) {
        max = sample;
      }
      if (sample < min) {
        min = sample;
      }
    }
    // clamp in case there are out-of-bounds values
    positive[i] = Math.min(1, max);
    negative[i] = Math.max(-1, min);
  }
  return { positive, negative };
}

/**
 * @param {string} sourceFileId
 * @param {[number, number]} trimFrames
 */
export async function getSamplePeaksForSourceFile(sourceFileId, trimFrames) {
  const audioBuffer = await getSourceAudioBuffer(sourceFileId, false);
  const monoSamples = getMonoSamplesFromAudioBuffer(audioBuffer, trimFrames);
  const waveformPeaks = getPeaksForSamples(monoSamples, WAVEFORM_CACHED_WIDTH);
  return waveformPeaks;
}

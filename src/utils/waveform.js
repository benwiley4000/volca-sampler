import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getMonoSamplesFromAudioBuffer,
  getSourceAudioBuffer,
  findSamplePeak,
} from './audioData.js';

export const GROUP_PIXEL_WIDTH = 6;

export const WAVEFORM_CACHED_WIDTH = GROUP_PIXEL_WIDTH * 44; // 264

/**
 * @typedef {{
 *   positive: Float32Array;
 *   negative: Float32Array;
 *   normalizationCoefficient: number
 * }} SamplePeaks
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
  const ignoredSamplesCount = samples.length % groupSize;
  const peakSearchArray = new Float32Array(
    positive.length + negative.length + ignoredSamplesCount
  );
  peakSearchArray.set(positive, 0);
  peakSearchArray.set(negative, positive.length);
  peakSearchArray.set(
    new Float32Array(
      samples.buffer,
      (samples.length - ignoredSamplesCount) * 4,
      ignoredSamplesCount
    ),
    positive.length + negative.length
  );
  const samplePeak = findSamplePeak(peakSearchArray);
  return {
    positive,
    negative,
    normalizationCoefficient: 1 / samplePeak,
  };
}

/**
 * @param {AudioBuffer} audioBuffer
 * @param {[number, number]} trimFrames
 */
export async function getSamplePeaksForAudioBuffer(audioBuffer, trimFrames) {
  const monoSamples = getMonoSamplesFromAudioBuffer(audioBuffer, trimFrames);
  const waveformPeaks = getPeaksForSamples(monoSamples, WAVEFORM_CACHED_WIDTH);
  return waveformPeaks;
}

/**
 * @param {import('../store').SampleContainer} sample
 * @returns {{
 *   sample: import('../store').SampleContainer;
 *   sourceAudioBuffer: AudioBuffer | null;
 * }}
 */
export function useLoadedSample(sample) {
  const [loadedAudioBuffer, setSourceAudioBuffer] = useState(
    /** @type {[string, AudioBuffer] | null} */ (null)
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const audioBuffer = await getSourceAudioBuffer(
        sample.metadata.sourceFileId,
        Boolean(sample.metadata.userFileInfo)
      );
      if (cancelled) return;
      setSourceAudioBuffer([sample.metadata.sourceFileId, audioBuffer]);
    })();
    return () => {
      cancelled = true;
    };
  }, [sample.metadata.sourceFileId, sample.metadata.userFileInfo]);

  // We need to hold onto an internal state because when the sample changes,
  // the sourceAudioBuffer loads asynchronously and we want to avoid trying
  // to apply the new sample's metadata to the old sample's audio.
  const displayedSample = useRef(sample);
  if (
    loadedAudioBuffer &&
    sample.metadata.sourceFileId === loadedAudioBuffer[0]
  ) {
    displayedSample.current = sample;
  }

  return {
    sample: displayedSample.current,
    sourceAudioBuffer: loadedAudioBuffer && loadedAudioBuffer[1],
  };
}

/**
 * @param {AudioBuffer | null} sourceAudioBuffer
 */
export function useWaveformInfo(sourceAudioBuffer) {
  const monoSamples = useMemo(
    () =>
      sourceAudioBuffer
        ? getMonoSamplesFromAudioBuffer(sourceAudioBuffer, [0, 0])
        : new Float32Array(),
    [sourceAudioBuffer]
  );
  const [waveformElement, waveformRef] = useState(
    /** @type {HTMLElement | null} */ (null)
  );
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pixelWidth = useMemo(
    // size will initially be 0 so use waveform element width if size isn't set
    () => waveformElement && (size.width || waveformElement.offsetWidth),
    [waveformElement, size]
  );
  const peaks = useMemo(() => {
    if (!pixelWidth || !monoSamples.length) {
      return {
        positive: new Float32Array(),
        negative: new Float32Array(),
        normalizationCoefficient: Infinity,
      };
    }
    return getPeaksForSamples(monoSamples, pixelWidth);
  }, [pixelWidth, monoSamples]);
  return {
    monoSamples,
    waveformRef,
    pixelWidth,
    peaks,
    onResize: setSize,
  };
}

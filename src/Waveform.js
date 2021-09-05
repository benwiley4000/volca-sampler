import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  getAudioBufferForAudioFileData,
  getMonoSamplesFromAudioBuffer,
  findSamplePeak,
} from './utils';
import { SampleContainer } from './store';

/**
 * @param {Float32Array} samples an array of floats from -1 to 1
 * @param {number} groupSize the number of samples represented for each peak
 * @returns {{
 *   positive: Float32Array;
 *   negative: Float32Array;
 * }} arrays of peak positive and negative values
 */
function getPeaksForSamples(samples, groupSize) {
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
    positive[i] = max;
    negative[i] = min;
  }
  return { positive, negative };
}

/**
 * @param {{
 *   sample: import('./store').SampleContainer;
 *   onSetClip: (clip: [number, number]) => void;
 *   onSetNormalize: (normalize: number | false) => void;
 * }} props
 */
function Waveform({ sample, onSetClip, onSetNormalize }) {
  const [monoSamples, setMonoSamples] = useState(new Float32Array());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const fileData = await SampleContainer.getSourceFileData(
        sample.metadata.sourceFileId
      );
      if (cancelled) return;
      const audioBuffer = await getAudioBufferForAudioFileData(fileData);
      if (cancelled) return;
      const monoSamples = getMonoSamplesFromAudioBuffer(audioBuffer, [0, 0]);
      setMonoSamples(monoSamples);
    })();
    return () => {
      cancelled = true;
    };
  }, [sample.metadata.sourceFileId]);

  /**
   * @type {React.RefObject<HTMLDivElement>}
   */
  const ref = useRef(null);
  const groupWidth = 6;
  const peaks = useMemo(() => {
    const pixelWidth = ref.current && ref.current.offsetWidth;
    if (!pixelWidth || !monoSamples.length) {
      return {
        positive: new Float32Array(),
        negative: new Float32Array(),
      };
    }
    const groupSize = Math.floor(
      (groupWidth * monoSamples.length) / pixelWidth
    );
    return getPeaksForSamples(monoSamples, groupSize);
  }, [monoSamples]);
  const samplePeak = useMemo(
    () =>
      Math.max(findSamplePeak(peaks.negative), findSamplePeak(peaks.positive)),
    [peaks]
  );
  const peakTarget = sample.metadata.normalize || samplePeak;
  const scaleCoefficient = peakTarget / samplePeak;

  return (
    <div
      className="waveform"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
      ref={ref}
    >
      <div
        className="positive"
        style={{
          width: '100%',
          height: '67%',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div
          className="scaled"
          style={{
            width: '100%',
            height: `${100 * scaleCoefficient}%`,
            willChange: 'height',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {[].map.call(peaks.positive, (amplitude, index) => (
            <div
              key={index}
              className="bar"
              style={{
                width: groupWidth,
                height: `${100 * amplitude}%`,
                paddingRight: 1,
              }}
            >
              <div
                className="bar_inner"
                style={{ backgroundColor: 'red', height: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        className="negative"
        style={{
          width: '100%',
          height: '33%',
          display: 'flex',
          alignItems: 'flex-start',
        }}
      >
        <div
          className="scaled"
          style={{
            width: '100%',
            height: `${100 * scaleCoefficient}%`,
            willChange: 'height',
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          {[].map.call(peaks.negative, (amplitude, index) => (
            <div
              key={index}
              className="bar"
              style={{
                width: groupWidth,
                height: `${100 * -amplitude}%`,
                paddingRight: 1,
              }}
            >
              <div
                className="bar_inner"
                style={{ backgroundColor: 'darkred', height: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
      <input
        style={{ position: 'absolute', top: 0, left: 0 }}
        type="range"
        value={sample.metadata.normalize || undefined}
        min={0.1}
        max={1}
        step={0.01}
        onChange={(e) => onSetNormalize(Number(e.target.value))}
      />
    </div>
  );
}

export default Waveform;

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  getSourceAudioBuffer,
  getMonoSamplesFromAudioBuffer,
  findSamplePeak,
  getClippedView,
} from './utils/audioData';

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
 *   onSetScaleCoefficient: (scaleCoefficient: number) => void;
 * }} props
 */
function Waveform({
  sample: {
    metadata: { sourceFileId, fromUserFile, clip, scaleCoefficient },
  },
  onSetClip,
  onSetScaleCoefficient,
}) {
  const [sourceAudioBuffer, setSourceAudioBuffer] = useState(
    /** @type {AudioBuffer | null} */ (null)
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const audioBuffer = await getSourceAudioBuffer(
        sourceFileId,
        fromUserFile
      );
      if (cancelled) return;
      setSourceAudioBuffer(audioBuffer);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceFileId, fromUserFile]);

  const monoSamples = useMemo(
    () =>
      sourceAudioBuffer
        ? getMonoSamplesFromAudioBuffer(sourceAudioBuffer, [0, 0])
        : new Float32Array(),
    [sourceAudioBuffer]
  );

  /**
   * @type {React.RefObject<HTMLDivElement>}
   */
  const waveformRef = useRef(null);

  const groupWidth = 6;

  const peaks = useMemo(() => {
    const pixelWidth = waveformRef.current && waveformRef.current.offsetWidth;
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

  const clippedSamplePeak = useMemo(() => {
    if (!sourceAudioBuffer) {
      return 1;
    }
    const clipFrames = /** @type {[number, number]} */ (
      clip.map((c) => Math.round(c * sourceAudioBuffer.sampleRate))
    );
    const clippedView = getClippedView(monoSamples, clipFrames);
    const samplePeak = findSamplePeak(clippedView);
    return samplePeak;
  }, [sourceAudioBuffer, monoSamples, clip]);

  const maxCoefficient = 1 / clippedSamplePeak;

  // ensure that our max scaled sample in our clipped view doesn't exceed 1 / -1
  useEffect(() => {
    if (scaleCoefficient > maxCoefficient) {
      onSetScaleCoefficient(maxCoefficient);
    }
  }, [scaleCoefficient, maxCoefficient, onSetScaleCoefficient]);

  const peakTarget = scaleCoefficient * clippedSamplePeak;

  return (
    <>
      <div
        className="waveform"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
        ref={waveformRef}
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
          value={peakTarget}
          min={0.1}
          max={1}
          step={0.01}
          onChange={(e) => {
            onSetScaleCoefficient(Number(e.target.value) / clippedSamplePeak);
          }}
        />
      </div>
      <button
        type="button"
        disabled={scaleCoefficient === maxCoefficient}
        onClick={() => onSetScaleCoefficient(maxCoefficient)}
      >
        Normalize
      </button>
      <button
        type="button"
        disabled={scaleCoefficient === 1}
        onClick={() => onSetScaleCoefficient(1)}
      >
        Original level
      </button>
    </>
  );
}

export default Waveform;

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { styled } from 'tonami';

import {
  getSourceAudioBuffer,
  getMonoSamplesFromAudioBuffer,
  findSamplePeak,
  getTrimmedView,
} from './utils/audioData.js';

const groupWidth = 6;

const WaveformDiv = styled.div({
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
});

const WaveformSection = styled.div({
  width: '100%',
  height: ({ $positive }) => ($positive ? '67%' : '33%'),
  display: 'flex',
  alignItems: ({ $positive }) => ($positive ? 'flex-end' : 'flex-start'),
});

const Scaled = styled.div({
  width: '100%',
  height: ({ $scaleCoefficient }) => `${100 * $scaleCoefficient}%`,
  willChange: 'height',
  display: 'flex',
  alignItems: ({ $positive }) => ($positive ? 'flex-end' : 'flex-start'),
});

const Bar = styled.div({
  width: `${groupWidth}px`,
  height: ({ $amplitude, $positive }) =>
    `${100 * ($positive ? 1 : -1) * $amplitude}%`,
  paddingRight: '1px',
});

const BarInner = styled.div({
  backgroundColor: ({ $positive }) => ($positive ? 'red' : 'darkred'),
  height: '100%',
});

/**
 * @type {React.FC<React.InputHTMLAttributes<HTMLInputElement>>}
 */
const ScaleInput = styled.input({
  position: 'absolute',
  top: 0,
  left: 0,
});

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
 * @typedef {{
 *   sample: import('./store').SampleContainer;
 *   onSetTrimFrames: (trimFrames: [number, number]) => void;
 *   onSetScaleCoefficient: (scaleCoefficient: number) => void;
 * }} WaveformProps
 */

/**
 * @param {WaveformProps & { sourceAudioBuffer: AudioBuffer | null }} props
 */
function Waveform({
  sourceAudioBuffer,
  sample: {
    metadata: { trimFrames, scaleCoefficient },
  },
  onSetTrimFrames,
  onSetScaleCoefficient,
}) {
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

  const trimmedSamplePeak = useMemo(() => {
    if (!sourceAudioBuffer) {
      return 0;
    }
    const trimmedView = getTrimmedView(monoSamples, trimFrames);
    const samplePeak = findSamplePeak(trimmedView);
    return samplePeak;
  }, [sourceAudioBuffer, monoSamples, trimFrames]);

  const maxCoefficient = 1 / trimmedSamplePeak;

  // ensure that our max scaled sample in our trimmed view doesn't exceed 1 / -1
  useLayoutEffect(() => {
    if (scaleCoefficient > maxCoefficient) {
      onSetScaleCoefficient(maxCoefficient);
    }
  }, [scaleCoefficient, maxCoefficient, onSetScaleCoefficient]);

  const peakTarget = scaleCoefficient * trimmedSamplePeak;

  return (
    <>
      <WaveformDiv ref={waveformRef}>
        {[true, false].map((positive) => {
          const key = positive ? 'positive' : 'negative';
          return (
            <WaveformSection key={key} $positive={positive}>
              <Scaled $scaleCoefficient={scaleCoefficient} $positive={positive}>
                {[].map.call(peaks[key], (amplitude, index) => (
                  <Bar key={index} $amplitude={amplitude} $positive={positive}>
                    <BarInner $positive={positive} />
                  </Bar>
                ))}
              </Scaled>
            </WaveformSection>
          );
        })}
        <ScaleInput
          type="range"
          disabled={trimmedSamplePeak === 0}
          value={peakTarget}
          min={0.1}
          max={1}
          step={0.01}
          onChange={(e) => {
            if (trimmedSamplePeak === 0) {
              return;
            }
            onSetScaleCoefficient(Number(e.target.value) / trimmedSamplePeak);
          }}
        />
      </WaveformDiv>
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

/**
 *
 * @param {WaveformProps} props
 */
function AsyncWaveform({ sample, ...rest }) {
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

  return (
    <Waveform
      {...rest}
      sample={displayedSample.current}
      sourceAudioBuffer={loadedAudioBuffer && loadedAudioBuffer[1]}
    />
  );
}

export default AsyncWaveform;

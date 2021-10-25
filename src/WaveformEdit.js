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
import { getPeaksForSamples } from './utils/waveform.js';
import WaveformDisplay from './WaveformDisplay.js';

/**
 * @type {React.FC<React.InputHTMLAttributes<HTMLInputElement>>}
 */
const ScaleInput = styled.input({
  position: 'absolute',
});

/**
 * @typedef {{
 *   sample: import('./store').SampleContainer;
 *   onSetTrimFrames: (trimFrames: [number, number]) => void;
 *   onSetScaleCoefficient: (scaleCoefficient: number) => void;
 * }} WaveformEditProps
 */

/**
 * @param {WaveformEditProps & { sourceAudioBuffer: AudioBuffer | null }} props
 */
function WaveformEdit({
  sourceAudioBuffer,
  sample: {
    metadata: {
      trim: { frames: trimFrames },
      scaleCoefficient,
    },
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
   * @type {React.RefObject<HTMLElement>}
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
    return getPeaksForSamples(monoSamples, pixelWidth);
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
      <WaveformDisplay
        waveformRef={waveformRef}
        peaks={peaks}
        scaleCoefficient={scaleCoefficient}
      />
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
 * @param {WaveformEditProps} props
 */
function AsyncWaveformEdit({ sample, ...rest }) {
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
    <WaveformEdit
      {...rest}
      sample={displayedSample.current}
      sourceAudioBuffer={loadedAudioBuffer && loadedAudioBuffer[1]}
    />
  );
}

export default AsyncWaveformEdit;

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from 'react-bootstrap';
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

  const [waveformElement, waveformRef] = useState(
    /** @type {HTMLElement | null} */ (null)
  );
  const pixelWidth = useMemo(
    () => waveformElement && waveformElement.offsetWidth,
    [waveformElement]
  );
  const peaks = useMemo(() => {
    if (!pixelWidth || !monoSamples.length) {
      return {
        positive: new Float32Array(),
        negative: new Float32Array(),
      };
    }
    return getPeaksForSamples(monoSamples, pixelWidth);
  }, [pixelWidth, monoSamples]);

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

  const trimPixels = useMemo(() => {
    if (!monoSamples.length || !pixelWidth) {
      return [0, 0];
    }
    const factor = pixelWidth / monoSamples.length;
    return trimFrames.map((frames) => frames * factor);
  }, [pixelWidth, monoSamples.length, trimFrames]);

  const leftTrimLastX = useRef(/** @type {number | null} */ (null));
  const rightTrimLastX = useRef(/** @type {number | null} */ (null));

  useEffect(() => {
    /** @param {MouseEvent} e */
    function onMouseMove(e) {
      if (
        leftTrimLastX.current === null ||
        !pixelWidth ||
        !monoSamples.length
      ) {
        return;
      }
      const { pageX } = e;
      const diff = pageX - leftTrimLastX.current;
      if (diff) {
        const ratio = diff / pixelWidth;
        const frameDiff = Math.round(monoSamples.length * ratio);
        onSetTrimFrames((trimFrames) => {
          let newValue = trimFrames[0] + frameDiff;
          // enforce at least 2000 sample selection
          newValue = Math.min(
            newValue,
            monoSamples.length - trimFrames[1] - 2000
          );
          newValue = Math.max(newValue, 0);
          return [newValue, trimFrames[1]];
        });
        leftTrimLastX.current = pageX;
      }
    }
    function onMouseUp() {
      leftTrimLastX.current = null;
      delete document.body.style.userSelect;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pixelWidth, monoSamples.length, onSetTrimFrames]);
  useEffect(() => {
    /** @param {MouseEvent} e */
    function onMouseMove(e) {
      if (
        rightTrimLastX.current === null ||
        !pixelWidth ||
        !monoSamples.length
      ) {
        return;
      }
      const { pageX } = e;
      const diff = rightTrimLastX.current - pageX;
      if (diff) {
        const ratio = diff / pixelWidth;
        const frameDiff = Math.round(monoSamples.length * ratio);
        onSetTrimFrames((trimFrames) => {
          let newValue = trimFrames[1] + frameDiff;
          // enforce at least 2000 sample selection
          newValue = Math.min(
            newValue,
            monoSamples.length - trimFrames[0] - 2000
          );
          newValue = Math.max(newValue, 0);
          return [trimFrames[0], newValue];
        });
        rightTrimLastX.current = pageX;
      }
    }
    function onMouseUp() {
      rightTrimLastX.current = null;
      delete document.body.style.userSelect;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pixelWidth, monoSamples.length, onSetTrimFrames]);

  return (
    <>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', right: 0, bottom: 4 }}>
          <Button
            type="button"
            variant="light"
            disabled={scaleCoefficient === maxCoefficient}
            onClick={() => onSetScaleCoefficient(maxCoefficient)}
          >
            Normalize
          </Button>{' '}
          <Button
            type="button"
            variant="light"
            disabled={scaleCoefficient === 1}
            onClick={() => onSetScaleCoefficient(1)}
          >
            Original level
          </Button>
        </div>
      </div>
      {/* <ScaleInput
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
      /> */}
      <div style={{ position: 'relative',   backgroundColor: '#f3f3f3',
 }}>
        <WaveformDisplay
          waveformRef={waveformRef}
          peaks={peaks}
          scaleCoefficient={scaleCoefficient}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: `calc(100% - ${trimPixels[0]}px)`,
            background: '#f3f3f3',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: 2,
              background: 'black',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: 20,
              height: 20,
              background: 'black',
              borderRadius: 10,
              transform: 'translateX(50%)',
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              document.body.style.userSelect = 'none';
              leftTrimLastX.current = e.touches[0].pageX;
            }}
            onMouseDown={(e) => {
              document.body.style.userSelect = 'none';
              leftTrimLastX.current = e.pageX;
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              if (
                leftTrimLastX.current === null ||
                !pixelWidth ||
                !monoSamples.length
              ) {
                return;
              }
              const { pageX } = e.touches[0];
              const diff = pageX - leftTrimLastX.current;
              if (diff) {
                const ratio = diff / pixelWidth;
                const frameDiff = Math.round(monoSamples.length * ratio);
                onSetTrimFrames(trimFrames => {
                  let newValue = trimFrames[0] + frameDiff;
                  // enforce at least 2000 sample selection
                  newValue = Math.min(
                    newValue,
                    monoSamples.length - trimFrames[1] - 2000
                  );
                  newValue = Math.max(newValue, 0);
                  return [newValue, trimFrames[1]];
                });
                leftTrimLastX.current = pageX;
              }
            }}
            onTouchEnd={() => {
              leftTrimLastX.current = null;
            }}
            onTouchCancel={() => {
              leftTrimLastX.current = null;
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            left: `calc(100% - ${trimPixels[1]}px)`,
            background: '#f3f3f3',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 2,
              background: 'black',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: 20,
              height: 20,
              background: 'black',
              borderRadius: 10,
              transform: 'translateX(-50%)',
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              document.body.style.userSelect = 'none';
              rightTrimLastX.current = e.touches[0].pageX;
            }}
            onMouseDown={(e) => {
              document.body.style.userSelect = 'none';
              rightTrimLastX.current = e.pageX;
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              if (
                rightTrimLastX.current === null ||
                !pixelWidth ||
                !monoSamples.length
              ) {
                return;
              }
              const { pageX } = e.touches[0];
              const diff = rightTrimLastX.current - pageX;
              if (diff) {
                const ratio = diff / pixelWidth;
                const frameDiff = Math.round(monoSamples.length * ratio);
                onSetTrimFrames(trimFrames => {
                  let newValue = trimFrames[1] + frameDiff;
                  // enforce at least 2000 sample selection
                  newValue = Math.min(
                    newValue,
                    monoSamples.length - trimFrames[0] - 2000
                  );
                  newValue = Math.max(newValue, 0);
                  return [trimFrames[0], newValue];
                });
                rightTrimLastX.current = pageX;
              }
            }}
            onTouchEnd={() => {
              rightTrimLastX.current = null;
            }}
            onTouchCancel={() => {
              rightTrimLastX.current = null;
            }}
          />
        </div>
      </div>
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

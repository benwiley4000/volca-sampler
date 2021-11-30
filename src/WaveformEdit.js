import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Button } from 'react-bootstrap';

import { findSamplePeak, getTrimmedView } from './utils/audioData.js';
import { useLoadedSample, useWaveformInfo } from './utils/waveform.js';
import WaveformDisplay from './WaveformDisplay.js';

/**
 * @typedef {{
 *   sample: import('./store').SampleContainer;
 *   onSetTrimFrames: (updateTrimFrames: (old: [number, number]) => [number, number]) => void;
 *   onSetScaleCoefficient: (scaleCoefficient: number) => void;
 * }} WaveformEditProps
 */

/**
 * @param {WaveformEditProps} props
 */
function WaveformEdit({
  sample: _sample,
  onSetTrimFrames,
  onSetScaleCoefficient,
}) {
  const {
    sample: {
      metadata: {
        trim: { frames: trimFrames },
        scaleCoefficient,
      },
    },
    sourceAudioBuffer,
  } = useLoadedSample(_sample);
  const { monoSamples, waveformRef, pixelWidth, peaks } =
    useWaveformInfo(sourceAudioBuffer);

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

  // const peakTarget = scaleCoefficient * trimmedSamplePeak;

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
      if (!pixelWidth || !monoSamples.length) {
        return;
      }
      const { pageX } = e;
      if (leftTrimLastX.current !== null) {
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
      if (rightTrimLastX.current !== null) {
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
    }
    function onMouseUp() {
      leftTrimLastX.current = null;
      rightTrimLastX.current = null;
      document.body.style.userSelect = 'unset';
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
      <div style={{ position: 'relative', backgroundColor: '#f3f3f3' }}>
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
              background: 'var(--bs-dark)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: 20,
              height: 20,
              background: 'var(--bs-dark)',
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
              background: 'var(--bs-dark)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: 20,
              height: 20,
              background: 'var(--bs-dark)',
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

export default WaveformEdit;

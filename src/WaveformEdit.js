import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from 'react-bootstrap';
import playIcon from '@material-design-icons/svg/filled/play_arrow.svg';
import stopIcon from '@material-design-icons/svg/filled/stop.svg';

import {
  findSamplePeak,
  getTrimmedView,
  useAudioPlaybackContext,
} from './utils/audioData.js';
import { useLoadedSample, useWaveformInfo } from './utils/waveform.js';
import WaveformDisplay from './WaveformDisplay.js';

import classes from './WaveformEdit.module.scss';

/**
 * @param {number} sec
 * @param {number} decimals
 */
function formatTime(sec, decimals) {
  return `0:${sec.toFixed(decimals).padStart(3 + decimals, '0')}`;
}

/**
 * @typedef {{
 *   sample: import('./store').SampleContainer;
 *   previewWav: AudioBuffer | null;
 *   onSetTrimFrames: (updateTrimFrames: (old: [number, number]) => [number, number]) => void;
 *   onSetScaleCoefficient: (scaleCoefficient: number) => void;
 * }} WaveformEditProps
 */

/**
 * @param {WaveformEditProps} props
 */
function WaveformEdit({
  sample: _sample,
  previewWav,
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

  const [trimFramesLocal, setTrimFramesLocal] = useState(trimFrames);
  useEffect(() => {
    setTrimFramesLocal(trimFrames);
  }, [trimFrames]);

  const trimPixels = useMemo(() => {
    if (!monoSamples.length || !pixelWidth) {
      return [0, 0];
    }
    const factor = pixelWidth / monoSamples.length;
    return trimFramesLocal.map((frames) => frames * factor);
  }, [pixelWidth, monoSamples.length, trimFramesLocal]);

  /** @type {React.RefObject<HTMLDivElement>} */
  const leftTrimHandleRef = useRef(null);
  /** @type {React.RefObject<HTMLDivElement>} */
  const rightTrimHandleRef = useRef(null);

  const leftTrimLastX = useRef(/** @type {number | null} */ (null));
  const rightTrimLastX = useRef(/** @type {number | null} */ (null));

  /** @type {React.RefObject<HTMLDivElement>} */
  const waveformOverlayRef = useRef(null);

  const waveformOverlayDownFrame = useRef(/** @type {number | null} */ (null));

  {
    const moveCallbackParams = useMemo(() => {
      if (!pixelWidth || !monoSamples.length) {
        return null;
      }
      const minPixelWidth = 10;
      const minFrameWidth = Math.max(
        // enforce at least 2000 sample selection
        2000,
        Math.ceil((minPixelWidth * monoSamples.length) / pixelWidth)
      );
      return {
        pixelWidth,
        monoSamplesLength: monoSamples.length,
        minFrameWidth,
      };
    }, [pixelWidth, monoSamples.length]);

    const trimFramesLocalRef = useRef(trimFramesLocal);
    trimFramesLocalRef.current = trimFramesLocal;
    useEffect(() => {
      if (
        !moveCallbackParams ||
        !leftTrimHandleRef.current ||
        !rightTrimHandleRef.current ||
        !waveformOverlayRef.current
      ) {
        return;
      }
      const { pixelWidth, monoSamplesLength, minFrameWidth } =
        moveCallbackParams;
      const { left: waveformClientLeft } =
        waveformOverlayRef.current.getBoundingClientRect();

      /** @param {MouseEvent | TouchEvent} e */
      function onLeftHandleDown(e) {
        e.preventDefault();
        document.body.style.userSelect = 'none';
        const { pageX } = e instanceof MouseEvent ? e : e.touches[0];
        leftTrimLastX.current = pageX;
      }

      /** @param {MouseEvent | TouchEvent} e */
      function onRightHandleDown(e) {
        e.preventDefault();
        document.body.style.userSelect = 'none';
        const { pageX } = e instanceof MouseEvent ? e : e.touches[0];
        rightTrimLastX.current = pageX;
      }

      /** @param {MouseEvent | TouchEvent} e */
      function onWaveformOverlayDown(e) {
        e.preventDefault();
        if (e.detail === 2) {
          // double-mousedown... select everything
          onSetTrimFrames(() => [0, 0]);
          return;
        }
        document.body.style.userSelect = 'none';
        const { clientX } = e instanceof MouseEvent ? e : e.touches[0];
        const waveformX = clientX - waveformClientLeft;
        const ratio = waveformX / pixelWidth;
        const frameFrom = Math.round(monoSamplesLength * ratio);
        const frameToTentative = frameFrom + minFrameWidth;
        const frameTo =
          frameToTentative < monoSamplesLength
            ? frameToTentative
            : frameFrom - minFrameWidth;
        if (frameTo < 0) {
          // looks like we don't have enough room to make the minimum selection
          return;
        }
        setTrimFramesLocal([
          Math.min(frameFrom, frameTo),
          monoSamplesLength - 1 - Math.max(frameFrom, frameTo),
        ]);
        waveformOverlayDownFrame.current = frameFrom;
      }

      /** @param {MouseEvent | TouchEvent} e */
      function onLeftHandleMove(e) {
        if (leftTrimLastX.current === null) {
          return;
        }
        e.preventDefault();
        const { pageX } = e instanceof MouseEvent ? e : e.touches[0];
        const diff = pageX - leftTrimLastX.current;
        if (diff) {
          const ratio = diff / pixelWidth;
          const frameDiff = Math.round(monoSamplesLength * ratio);
          setTrimFramesLocal((trimFrames) => {
            let newValue = trimFrames[0] + frameDiff;
            newValue = Math.min(
              newValue,
              monoSamplesLength - trimFrames[1] - minFrameWidth
            );
            newValue = Math.max(newValue, 0);
            return [newValue, trimFrames[1]];
          });
          leftTrimLastX.current = pageX;
        }
      }

      /** @param {MouseEvent | TouchEvent} e */
      function onRightHandleMove(e) {
        if (rightTrimLastX.current === null) {
          return;
        }
        e.preventDefault();
        const { pageX } = e instanceof MouseEvent ? e : e.touches[0];
        const diff = rightTrimLastX.current - pageX;
        if (diff) {
          const ratio = diff / pixelWidth;
          const frameDiff = Math.round(monoSamplesLength * ratio);
          setTrimFramesLocal((trimFrames) => {
            let newValue = trimFrames[1] + frameDiff;
            newValue = Math.min(
              newValue,
              monoSamplesLength - trimFrames[0] - minFrameWidth
            );
            newValue = Math.max(newValue, 0);
            return [trimFrames[0], newValue];
          });
          rightTrimLastX.current = pageX;
        }
      }

      /** @param {MouseEvent | TouchEvent} e */
      function onWaveformOverlayMove(e) {
        if (waveformOverlayDownFrame.current === null) {
          return;
        }
        e.preventDefault();
        const frameFrom = waveformOverlayDownFrame.current;
        const { clientX } = e instanceof MouseEvent ? e : e.touches[0];
        const waveformX = clientX - waveformClientLeft;
        const ratio = waveformX / pixelWidth;
        const frameToTentative = Math.max(
          0,
          Math.min(monoSamplesLength - 1, Math.round(monoSamplesLength * ratio))
        );
        if (frameToTentative !== waveformOverlayDownFrame.current) {
          const aboveFrameMin = frameFrom + minFrameWidth;
          const belowFrameMax = frameFrom - minFrameWidth;
          const frameTo =
            frameToTentative > frameFrom
              ? aboveFrameMin < monoSamplesLength
                ? Math.max(frameToTentative, aboveFrameMin)
                : belowFrameMax
              : belowFrameMax >= 0
              ? Math.min(frameToTentative, belowFrameMax)
              : aboveFrameMin;
          setTrimFramesLocal([
            Math.min(frameFrom, frameTo),
            monoSamplesLength - 1 - Math.max(frameFrom, frameTo),
          ]);
        }
      }

      /** @param {MouseEvent} e */
      function onMouseMove(e) {
        onLeftHandleMove(e);
        onRightHandleMove(e);
        onWaveformOverlayMove(e);
      }

      /** @param {MouseEvent | TouchEvent} e */
      function onUp(e) {
        if (
          leftTrimLastX.current !== null ||
          rightTrimLastX.current !== null ||
          waveformOverlayDownFrame.current !== null
        ) {
          e.preventDefault();
          onSetTrimFrames(() => trimFramesLocalRef.current);
          leftTrimLastX.current = null;
          rightTrimLastX.current = null;
          waveformOverlayDownFrame.current = null;
        }
        document.body.style.userSelect = 'unset';
      }

      const leftHandle = leftTrimHandleRef.current;
      const rightHandle = rightTrimHandleRef.current;
      const waveformOverlay = waveformOverlayRef.current;
      leftHandle.addEventListener('touchstart', onLeftHandleDown);
      leftHandle.addEventListener('mousedown', onLeftHandleDown);
      rightHandle.addEventListener('touchstart', onRightHandleDown);
      rightHandle.addEventListener('mousedown', onRightHandleDown);
      waveformOverlay.addEventListener('touchstart', onWaveformOverlayDown);
      waveformOverlay.addEventListener('mousedown', onWaveformOverlayDown);
      leftHandle.addEventListener('touchmove', onLeftHandleMove);
      rightHandle.addEventListener('touchmove', onRightHandleMove);
      waveformOverlay.addEventListener('touchmove', onWaveformOverlayMove);
      window.addEventListener('mousemove', onMouseMove);
      leftHandle.addEventListener('touchend', onUp);
      leftHandle.addEventListener('touchcancel', onUp);
      rightHandle.addEventListener('touchend', onUp);
      rightHandle.addEventListener('touchcancel', onUp);
      waveformOverlay.addEventListener('touchend', onUp);
      waveformOverlay.addEventListener('touchcancel', onUp);
      window.addEventListener('mouseup', onUp);
      return () => {
        leftHandle.removeEventListener('touchstart', onLeftHandleDown);
        leftHandle.removeEventListener('mousedown', onLeftHandleDown);
        rightHandle.removeEventListener('touchstart', onRightHandleDown);
        rightHandle.removeEventListener('mousedown', onRightHandleDown);
        waveformOverlay.removeEventListener(
          'touchstart',
          onWaveformOverlayDown
        );
        waveformOverlay.removeEventListener('mousedown', onWaveformOverlayDown);
        leftHandle.removeEventListener('touchmove', onLeftHandleMove);
        rightHandle.removeEventListener('touchmove', onRightHandleMove);
        waveformOverlay.removeEventListener('touchmove', onWaveformOverlayMove);
        window.removeEventListener('mousemove', onMouseMove);
        leftHandle.removeEventListener('touchend', onUp);
        leftHandle.removeEventListener('touchcancel', onUp);
        rightHandle.removeEventListener('touchend', onUp);
        rightHandle.removeEventListener('touchcancel', onUp);
        waveformOverlay.removeEventListener('touchend', onUp);
        waveformOverlay.removeEventListener('touchcancel', onUp);
        window.removeEventListener('mouseup', onUp);
      };
    }, [moveCallbackParams, onSetTrimFrames]);
  }

  const { playAudioBuffer } = useAudioPlaybackContext();

  // to be set when playback is started
  const stopPreviewPlayback = useRef(() => {});
  useEffect(() => {
    return () => stopPreviewPlayback.current();
  }, [_sample, trimFramesLocal]);

  const [callbackOnPreviewWav, setCallbackOnPreviewWav] = useState(
    /** @type {{ fn: () => void } | null} */ (null)
  );
  useEffect(() => {
    if (previewWav instanceof AudioBuffer && callbackOnPreviewWav) {
      setCallbackOnPreviewWav(null);
      callbackOnPreviewWav.fn();
    }
  }, [previewWav, callbackOnPreviewWav]);

  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);

  return (
    <>
      <div className={classes.scaleButtonsContainer}>
        <div className={classes.scaleButtons}>
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
      <div
        className={[
          classes.waveformContainer,
          isPlaybackActive ? classes.playbackActive : '',
        ].join(' ')}
        style={{
          // @ts-ignore
          '--trim-pixels-left': `${trimPixels[0]}px`,
          // @ts-ignore
          '--trim-pixels-right': `${trimPixels[1]}px`,
          // @ts-ignore
          '--playback-progress': `${100 * playbackProgress}%`,
        }}
      >
        <WaveformDisplay
          waveformRef={waveformRef}
          peaks={peaks}
          scaleCoefficient={scaleCoefficient}
        />
        <div className={classes.playbackOverlay}>
          <div className={classes.playback} />
        </div>
        <div className={[classes.trim, classes.left].join(' ')}>
          <div className={classes.bar} />
          <div ref={leftTrimHandleRef} className={classes.handle} />
          {sourceAudioBuffer && Boolean(monoSamples.length) && (
            <span className={classes.time}>
              {formatTime(
                (sourceAudioBuffer.duration * trimFramesLocal[0]) / monoSamples.length,
                2
              )}
            </span>
          )}
        </div>
        <div className={[classes.trim, classes.right].join(' ')}>
          <div className={classes.bar} />
          <div ref={rightTrimHandleRef} className={classes.handle} />
          {sourceAudioBuffer && Boolean(monoSamples.length) && (
            <span className={classes.time}>
              {formatTime(
                (sourceAudioBuffer.duration *
                  (monoSamples.length - 1 - trimFramesLocal[1])) /
                  monoSamples.length,
                2
              )}
            </span>
          )}
        </div>
        <div ref={waveformOverlayRef} className={classes.waveformOverlay} />
        <div className={classes.playbackButtonContainer}>
          <Button
            variant="dark"
            onClick={(e) => {
              if (isPlaybackActive) {
                stopPreviewPlayback.current();
                return;
              }
              if (previewWav) {
                stopPreviewPlayback.current = playAudioBuffer(previewWav, {
                  onTimeUpdate(currentTime) {
                    setPlaybackProgress(currentTime / previewWav.duration);
                  },
                  onEnded() {
                    setIsPlaybackActive(false);
                  },
                });
                setPlaybackProgress(0);
                setIsPlaybackActive(true);
              } else {
                const button = e.currentTarget;
                // wait until the audio buffer is ready then simulate a click event
                // to retry this handler. it's important that we simulate another
                // click because otherwise iOS won't let us play the audio later.
                setCallbackOnPreviewWav({ fn: () => button.click() });
              }
            }}
          >
            <img
              src={isPlaybackActive ? stopIcon : playIcon}
              alt="Play preview"
            />
          </Button>
          {previewWav && (
            <span>
              {isPlaybackActive
                ? formatTime(playbackProgress * previewWav.duration, 1)
                : formatTime(previewWav.duration, 1)}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default WaveformEdit;

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';

import { findSamplePeak, getTrimmedView } from './utils/audioData.js';
import {
  useLoadedSample,
  useWaveformInfo,
  useWaveformPlayback,
} from './utils/waveform.js';
import { formatShortTime } from './utils/datetime.js';
import WaveformDisplay from './WaveformDisplay.js';
import WaveformPlayback from './WaveformPlayback.js';
import NormalizeControl from './NomalizeControl.js';
import { usePreviewAudio } from './sampleCacheStore.js';
import { ReactComponent as ScissorsCuttingIcon } from './icons/scissors-cutting.svg';

import classes from './WaveformEdit.module.scss';

const WaveformEdit = React.memo(
  /**
   * @param {{
   *   sample: import('./store').SampleContainer;
   *   sampleCache: import('./sampleCacheStore.js').SampleCache | null;
   *   editCacheInvalidator: Symbol;
   *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
   * }} props
   */
  function WaveformEdit({
    sample: _sample,
    sampleCache,
    editCacheInvalidator,
    onSampleUpdate,
  }) {
    const { wavData: previewWavFile, audioBuffer: previewAudioBuffer } =
      usePreviewAudio(sampleCache);
    const {
      sample: {
        id: loadedSampleId,
        metadata: {
          name,
          trim: { frames: trimFrames },
          normalize,
        },
      },
      pluginProcessedAudioBuffer,
    } = useLoadedSample(_sample, editCacheInvalidator);

    const { monoSamples, waveformRef, pixelWidth, peaks, onResize } =
      useWaveformInfo(pluginProcessedAudioBuffer);

    const absoluteSamplePeak = useMemo(() => {
      return Math.max(
        findSamplePeak(peaks.negative),
        findSamplePeak(peaks.positive)
      );
    }, [peaks]);

    const trimmedSamplePeak = useMemo(() => {
      if (!pluginProcessedAudioBuffer) {
        return 0;
      }
      const trimmedView = getTrimmedView(monoSamples, trimFrames);
      const samplePeak = findSamplePeak(trimmedView);
      return samplePeak;
    }, [pluginProcessedAudioBuffer, monoSamples, trimFrames]);

    const normalizationCoefficient =
      normalize === 'selection'
        ? 1 / trimmedSamplePeak
        : 1 / absoluteSamplePeak;

    const [trimFramesLocal, setTrimFramesLocal] = useState({
      trimFrames,
      cursor: /** @type {number | null} */ (null),
    });
    useEffect(() => {
      setTrimFramesLocal({ trimFrames, cursor: null });
    }, [trimFrames]);

    const postPluginFrames =
      monoSamples.length ||
      (sampleCache && sampleCache.cachedInfo.postPluginFrameCount) ||
      0;

    const trimPixels = useMemo(() => {
      if (!postPluginFrames || !pixelWidth) {
        return [0, 0];
      }
      const factor = pixelWidth / postPluginFrames;
      return trimFramesLocal.trimFrames.map((frames) => frames * factor);
    }, [pixelWidth, postPluginFrames, trimFramesLocal.trimFrames]);

    const trimFramesLocalRef = useRef(trimFramesLocal);
    trimFramesLocalRef.current = trimFramesLocal;
    const selectedSampleId = useRef(_sample.id);
    selectedSampleId.current = _sample.id;
    const commitTrimFrames = useCallback(() => {
      if (loadedSampleId !== selectedSampleId.current) {
        return;
      }
      const { trimFrames } = trimFramesLocalRef.current;
      onSampleUpdate(loadedSampleId, (metadata) => {
        if (metadata.trim.frames.every((frame, i) => trimFrames[i] === frame)) {
          return metadata;
        }
        return {
          trim: { frames: trimFrames },
        };
      });
    }, [loadedSampleId, onSampleUpdate]);

    const awaitingCommit = useRef(false);
    useEffect(() => {
      if (awaitingCommit.current) {
        commitTrimFrames();
        awaitingCommit.current = false;
      }
    }, [trimFramesLocal, commitTrimFrames]);

    const resetTrim = useCallback(() => {
      awaitingCommit.current = true;
      setTrimFramesLocal({
        trimFrames: [0, 0],
        cursor: null,
      });
    }, []);

    /** @type {React.RefObject<HTMLDivElement>} */
    const leftTrimHandleRef = useRef(null);
    /** @type {React.RefObject<HTMLDivElement>} */
    const rightTrimHandleRef = useRef(null);

    /** @type {React.RefObject<HTMLDivElement>} */
    const waveformOverlayRef = useRef(null);

    {
      const leftTrimLastX = useRef(/** @type {number | null} */ (null));
      const rightTrimLastX = useRef(/** @type {number | null} */ (null));

      const waveformOverlayDownFrame = useRef(
        /** @type {number | null} */ (null)
      );
      const waveformOverlayDragged = useRef(false);

      const trimFramesUpdateTimeout = useRef(
        /** @type {NodeJS.Timeout | null} */ (null)
      );

      useLayoutEffect(() => {
        if (trimFramesUpdateTimeout.current) {
          clearTimeout(trimFramesUpdateTimeout.current);
          trimFramesUpdateTimeout.current = null;
        }
      }, [trimFramesLocal]);

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

      useEffect(() => {
        if (
          !moveCallbackParams ||
          !leftTrimHandleRef.current ||
          !rightTrimHandleRef.current ||
          !waveformOverlayRef.current
        ) {
          return;
        }

        const leftHandle = leftTrimHandleRef.current;
        const rightHandle = rightTrimHandleRef.current;
        const waveformOverlay = waveformOverlayRef.current;

        const { pixelWidth, monoSamplesLength, minFrameWidth } =
          moveCallbackParams;
        let waveformClientLeft = 0;
        // we'll update this as needed (on mousedown/touchstart). this is
        // partially because on resize, the page layout is still shifting and
        // reading the value early can be unreliable.
        function updateWaveformClientLeft() {
          waveformClientLeft = waveformOverlay.getBoundingClientRect().left;
        }

        /** @param {MouseEvent | TouchEvent} e */
        function onLeftHandleDown(e) {
          if (e instanceof TouchEvent) {
            e.preventDefault();
          }
          document.body.style.userSelect = 'none';
          const { pageX } = e instanceof MouseEvent ? e : e.touches[0];
          leftTrimLastX.current = pageX;
        }

        /** @param {MouseEvent | TouchEvent} e */
        function onRightHandleDown(e) {
          if (e instanceof TouchEvent) {
            e.preventDefault();
          }
          document.body.style.userSelect = 'none';
          const { pageX } = e instanceof MouseEvent ? e : e.touches[0];
          rightTrimLastX.current = pageX;
        }

        /** @param {MouseEvent | TouchEvent} e */
        function onWaveformOverlayDown(e) {
          if (e instanceof TouchEvent) {
            e.preventDefault();
          }
          if (e.detail === 2) {
            // double-mousedown... select everything
            resetTrim();
            return;
          }
          document.body.style.userSelect = 'none';
          const { clientX } = e instanceof MouseEvent ? e : e.touches[0];
          updateWaveformClientLeft();
          const waveformX = Math.max(
            0,
            Math.min(pixelWidth, clientX - waveformClientLeft)
          );
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
          setTrimFramesLocal({
            trimFrames: [
              Math.min(frameFrom, frameTo),
              monoSamplesLength - 1 - Math.max(frameFrom, frameTo),
            ],
            cursor: waveformX - 1,
          });
          waveformOverlayDownFrame.current = frameFrom;
        }

        /** @param {number} diff */
        function moveLeftHandle(diff) {
          const ratio = diff / pixelWidth;
          const frameDiff = Math.round(monoSamplesLength * ratio);
          setTrimFramesLocal(({ trimFrames }) => {
            let newValue = trimFrames[0] + frameDiff;
            newValue = Math.min(
              newValue,
              monoSamplesLength - trimFrames[1] - minFrameWidth
            );
            newValue = Math.max(newValue, 0);
            return {
              trimFrames: [newValue, trimFrames[1]],
              cursor: null,
            };
          });
        }

        /** @param {MouseEvent | TouchEvent} e */
        function onLeftHandleMove(e) {
          if (leftTrimLastX.current === null) {
            return;
          }
          if (e instanceof TouchEvent) {
            e.preventDefault();
          }
          const { pageX } = e instanceof MouseEvent ? e : e.touches[0];
          const diff = pageX - leftTrimLastX.current;
          if (diff) {
            moveLeftHandle(diff);
            leftTrimLastX.current = pageX;
          }
        }

        /** @param {number} diff */
        function moveRightHandle(diff) {
          const ratio = diff / pixelWidth;
          const frameDiff = Math.round(monoSamplesLength * ratio);
          setTrimFramesLocal(({ trimFrames }) => {
            let newValue = trimFrames[1] + frameDiff;
            newValue = Math.min(
              newValue,
              monoSamplesLength - trimFrames[0] - minFrameWidth
            );
            newValue = Math.max(newValue, 0);
            return {
              trimFrames: [trimFrames[0], newValue],
              cursor: null,
            };
          });
        }

        /** @param {MouseEvent | TouchEvent} e */
        function onRightHandleMove(e) {
          if (rightTrimLastX.current === null) {
            return;
          }
          if (e instanceof TouchEvent) {
            e.preventDefault();
          }
          const { pageX } = e instanceof MouseEvent ? e : e.touches[0];
          const diff = rightTrimLastX.current - pageX;
          if (diff) {
            moveRightHandle(diff);
            rightTrimLastX.current = pageX;
          }
        }

        let adjustedViaKeyboard = false;

        /** @param {KeyboardEvent} e */
        function onLeftHandleKeyDown(e) {
          if (leftTrimLastX.current !== null) {
            return;
          }
          let handled = true;
          switch (e.key) {
            case 'ArrowLeft':
              moveLeftHandle(-1);
              break;
            case 'ArrowRight':
              moveLeftHandle(1);
              break;
            default:
              handled = false;
              break;
          }
          if (handled) {
            e.stopPropagation();
            e.preventDefault();
            adjustedViaKeyboard = true;
          }
        }

        /** @param {KeyboardEvent} e */
        function onRightHandleKeyDown(e) {
          if (rightTrimLastX.current !== null) {
            return;
          }
          let handled = true;
          switch (e.key) {
            case 'ArrowLeft':
              moveRightHandle(1);
              break;
            case 'ArrowRight':
              moveRightHandle(-1);
              break;
            default:
              handled = false;
              break;
          }
          if (handled) {
            e.stopPropagation();
            e.preventDefault();
            adjustedViaKeyboard = true;
          }
        }

        /** @param {MouseEvent | TouchEvent} e */
        function onWaveformOverlayMove(e) {
          if (waveformOverlayDownFrame.current === null) {
            return;
          }
          if (e instanceof TouchEvent) {
            e.preventDefault();
          }
          const frameFrom = waveformOverlayDownFrame.current;
          const { clientX } = e instanceof MouseEvent ? e : e.touches[0];
          const waveformX = Math.max(
            0,
            Math.min(pixelWidth, clientX - waveformClientLeft)
          );
          const ratio = waveformX / pixelWidth;
          const frameToTentative = Math.max(
            0,
            Math.min(
              monoSamplesLength - 1,
              Math.round(monoSamplesLength * ratio)
            )
          );
          if (frameToTentative !== waveformOverlayDownFrame.current) {
            waveformOverlayDragged.current = true;
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
            setTrimFramesLocal({
              trimFrames: [
                Math.min(frameFrom, frameTo),
                monoSamplesLength - 1 - Math.max(frameFrom, frameTo),
              ],
              cursor: frameFrom < frameTo ? waveformX : waveformX - 1,
            });
          }
        }

        /** @param {MouseEvent} e */
        function onMouseMove(e) {
          onLeftHandleMove(e);
          onRightHandleMove(e);
          onWaveformOverlayMove(e);
        }

        /** @param {MouseEvent | TouchEvent | KeyboardEvent} e */
        function onUp(e) {
          if (
            leftTrimLastX.current !== null ||
            rightTrimLastX.current !== null ||
            waveformOverlayDownFrame.current !== null ||
            adjustedViaKeyboard
          ) {
            if (e instanceof TouchEvent || e instanceof KeyboardEvent) {
              e.preventDefault();
            }
            if (
              waveformOverlayDownFrame.current &&
              !waveformOverlayDragged.current &&
              e.detail === 1
            ) {
              // we might be doing a double click so let's delay the trim frames
              // update by 250ms. this avoids annoying/unnecessary visual updates.
              // note: a dblclick might take longer (up to 500ms normally) but I
              // think most users will do it in in under 250ms.
              trimFramesUpdateTimeout.current = setTimeout(() => {
                trimFramesUpdateTimeout.current = null;
                commitTrimFrames();
              }, 250);
            } else {
              commitTrimFrames();
            }
            leftTrimLastX.current = null;
            rightTrimLastX.current = null;
            waveformOverlayDownFrame.current = null;
            waveformOverlayDragged.current = false;
            adjustedViaKeyboard = false;
          }
          document.body.style.userSelect = 'unset';
        }

        /** @param {MouseEvent | TouchEvent | KeyboardEvent} e */
        function onActionOutsideWaveformOverlay(e) {
          if (e.target instanceof Node && waveformOverlay.contains(e.target)) {
            return;
          }
          if (trimFramesUpdateTimeout.current) {
            clearTimeout(trimFramesUpdateTimeout.current);
            trimFramesUpdateTimeout.current = null;
            commitTrimFrames();
          }
        }

        leftHandle.addEventListener('touchstart', onLeftHandleDown);
        leftHandle.addEventListener('mousedown', onLeftHandleDown);
        rightHandle.addEventListener('touchstart', onRightHandleDown);
        rightHandle.addEventListener('mousedown', onRightHandleDown);
        waveformOverlay.addEventListener('touchstart', onWaveformOverlayDown);
        waveformOverlay.addEventListener('mousedown', onWaveformOverlayDown);
        leftHandle.addEventListener('touchmove', onLeftHandleMove);
        rightHandle.addEventListener('touchmove', onRightHandleMove);
        leftHandle.addEventListener('keydown', onLeftHandleKeyDown);
        rightHandle.addEventListener('keydown', onRightHandleKeyDown);
        waveformOverlay.addEventListener('touchmove', onWaveformOverlayMove);
        window.addEventListener('mousemove', onMouseMove);
        leftHandle.addEventListener('touchend', onUp);
        leftHandle.addEventListener('touchcancel', onUp);
        leftHandle.addEventListener('keyup', onUp);
        rightHandle.addEventListener('touchend', onUp);
        rightHandle.addEventListener('keyup', onUp);
        rightHandle.addEventListener('touchcancel', onUp);
        waveformOverlay.addEventListener('touchend', onUp);
        waveformOverlay.addEventListener('touchcancel', onUp);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchstart', onActionOutsideWaveformOverlay, {
          capture: true,
        });
        window.addEventListener('mousedown', onActionOutsideWaveformOverlay, {
          capture: true,
        });
        window.addEventListener('keydown', onActionOutsideWaveformOverlay, {
          capture: true,
        });
        return () => {
          leftHandle.removeEventListener('touchstart', onLeftHandleDown);
          leftHandle.removeEventListener('mousedown', onLeftHandleDown);
          rightHandle.removeEventListener('touchstart', onRightHandleDown);
          rightHandle.removeEventListener('mousedown', onRightHandleDown);
          waveformOverlay.removeEventListener(
            'touchstart',
            onWaveformOverlayDown
          );
          waveformOverlay.removeEventListener(
            'mousedown',
            onWaveformOverlayDown
          );
          leftHandle.removeEventListener('touchmove', onLeftHandleMove);
          rightHandle.removeEventListener('touchmove', onRightHandleMove);
          leftHandle.removeEventListener('keydown', onLeftHandleKeyDown);
          rightHandle.removeEventListener('keydown', onRightHandleKeyDown);
          waveformOverlay.removeEventListener(
            'touchmove',
            onWaveformOverlayMove
          );
          window.removeEventListener('mousemove', onMouseMove);
          leftHandle.removeEventListener('touchend', onUp);
          leftHandle.removeEventListener('touchcancel', onUp);
          leftHandle.removeEventListener('keyup', onUp);
          rightHandle.removeEventListener('touchend', onUp);
          rightHandle.removeEventListener('keyup', onUp);
          rightHandle.removeEventListener('touchcancel', onUp);
          waveformOverlay.removeEventListener('touchend', onUp);
          waveformOverlay.removeEventListener('touchcancel', onUp);
          window.removeEventListener('mouseup', onUp);
          window.removeEventListener(
            'touchstart',
            onActionOutsideWaveformOverlay,
            { capture: true }
          );
          window.removeEventListener(
            'mousedown',
            onActionOutsideWaveformOverlay,
            { capture: true }
          );
          window.removeEventListener(
            'keydown',
            onActionOutsideWaveformOverlay,
            {
              capture: true,
            }
          );
        };
      }, [moveCallbackParams, commitTrimFrames, resetTrim]);
    }

    const {
      isPlaybackActive,
      playbackProgress,
      displayedTime,
      togglePlayback,
      stopPlayback,
    } = useWaveformPlayback(previewAudioBuffer || null, true);

    useEffect(() => {
      return stopPlayback;
    }, [_sample, trimFramesLocal, stopPlayback]);

    const allAudioSelected = _sample.metadata.trim.frames.every((f) => f === 0);

    const isClipping =
      trimmedSamplePeak * (normalize ? normalizationCoefficient : 1) > 1;

    return (
      <>
        <Form.Group className={classes.waveformAdjacentControls}>
          <NormalizeControl
            sampleId={loadedSampleId}
            normalize={normalize}
            onSampleUpdate={onSampleUpdate}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={allAudioSelected}
            onClick={resetTrim}
          >
            {allAudioSelected ? 'All audio selected' : 'Select all audio'}
          </Button>
        </Form.Group>
        <div
          className={[
            classes.waveformContainer,
            isPlaybackActive ? classes.playbackActive : '',
            normalize === 'selection' ? classes.normalizeOnlySelection : '',
          ].join(' ')}
          style={{
            // @ts-ignore
            '--cursor-display':
              trimFramesLocal.cursor === null ? 'none' : 'unset',
            // @ts-ignore
            '--cursor-left': `${trimFramesLocal.cursor}px`,
            // @ts-ignore
            '--trim-pixels-left': `${trimPixels[0]}px`,
            // @ts-ignore
            '--trim-pixels-right': `${trimPixels[1]}px`,
          }}
        >
          <WaveformDisplay peaks={peaks} scaleCoefficient={1} />
          <WaveformDisplay
            waveformRef={waveformRef}
            peaks={peaks}
            scaleCoefficient={normalize ? normalizationCoefficient : 1}
            opaque
            onResize={onResize}
          />
          <WaveformPlayback
            isPlaybackActive={isPlaybackActive}
            playbackProgress={playbackProgress}
            displayedTime={
              displayedTime ||
              (sampleCache &&
                formatShortTime(sampleCache.cachedInfo.duration, 1)) ||
              ''
            }
            downloadFilename={`${name}.volcasample.wav`}
            wavFile={previewWavFile || null}
            togglePlayback={togglePlayback}
          />
          <div className={classes.cursor} />
          <div className={[classes.trim, classes.left].join(' ')}>
            <div className={classes.bar} />
            <div
              ref={leftTrimHandleRef}
              className={classes.handle}
              tabIndex={0}
            />
            {sampleCache && Boolean(postPluginFrames) && (
              <span className={classes.time}>
                {formatShortTime(
                  (sampleCache.cachedInfo.duration *
                    trimFramesLocal.trimFrames[0]) /
                    postPluginFrames,
                  2
                )}
              </span>
            )}
          </div>
          <div className={[classes.trim, classes.right].join(' ')}>
            <div className={classes.bar} />
            <div
              ref={rightTrimHandleRef}
              className={classes.handle}
              tabIndex={0}
            />
            {sampleCache && Boolean(postPluginFrames) && (
              <span className={classes.time}>
                {formatShortTime(
                  (sampleCache.cachedInfo.duration *
                    (postPluginFrames - 1 - trimFramesLocal.trimFrames[1])) /
                    postPluginFrames,
                  2
                )}
              </span>
            )}
          </div>
          <div ref={waveformOverlayRef} className={classes.waveformOverlay} />
          {isClipping && (
            <OverlayTrigger
              delay={{ show: 400, hide: 0 }}
              overlay={<Tooltip>Audio is clipping - maybe normalize?</Tooltip>}
            >
              <div className={classes.clippingAlert}>
                <ScissorsCuttingIcon />
              </div>
            </OverlayTrigger>
          )}
        </div>
      </>
    );
  }
);

export default WaveformEdit;

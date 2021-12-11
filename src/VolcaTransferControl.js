import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, ProgressBar } from 'react-bootstrap';

import {
  getAudioBufferForAudioFileData,
  useAudioPlaybackContext,
} from './utils/audioData.js';
import { getSampleBuffer } from './utils/syro.js';

/**
 * @param {{
 *   sample: import('./store').SampleContainer;
 * }} props
 */
function VolcaTransferControl({ sample }) {
  const [syroProgress, setSyroProgress] = useState(0);
  const [syroTransferState, setSyroTransferState] = useState(
    /** @type {'idle' | 'transferring' | 'error'} */ ('idle')
  );
  const [syroAudioBuffer, setSyroAudioBuffer] = useState(
    /** @type {AudioBuffer | Error | null} */ (null)
  );
  const [callbackOnSyroBuffer, setCallbackOnSyroBuffer] = useState(
    /** @type {{ fn: () => void } | null} */ (null)
  );
  useEffect(() => {
    if (syroAudioBuffer instanceof AudioBuffer && callbackOnSyroBuffer) {
      setCallbackOnSyroBuffer(null);
      callbackOnSyroBuffer.fn();
    }
  }, [syroAudioBuffer, callbackOnSyroBuffer]);
  // to be set when transfer or playback is started
  const stop = useRef(() => {});
  useEffect(() => {
    let cancelled = false;
    setSyroProgress(0);
    setSyroTransferState('idle');
    setSyroAudioBuffer(null);
    setCallbackOnSyroBuffer(null);
    stop.current = () => {
      cancelled = true;
    };
    try {
      const { sampleBufferPromise, cancelWork } = getSampleBuffer(
        sample,
        (progress) => {
          if (!cancelled) {
            setSyroProgress(progress);
          }
        }
      );
      stop.current = () => {
        cancelWork();
        cancelled = true;
      };
      sampleBufferPromise.then(async (sampleBuffer) => {
        if (cancelled) {
          return;
        }
        stop.current = () => {
          cancelled = true;
        };
        const audioBuffer = await getAudioBufferForAudioFileData(sampleBuffer);
        if (!cancelled) {
          setSyroAudioBuffer(audioBuffer);
        }
      });
    } catch (err) {
      console.error(err);
      setSyroAudioBuffer(new Error(String(err)));
    }
    return () => stop.current();
  }, [sample]);
  const { playAudioBuffer } = useAudioPlaybackContext();
  /** @type {React.MouseEventHandler} */
  const handleTransfer = useCallback(
    (e) => {
      if (!(syroAudioBuffer instanceof AudioBuffer)) {
        if (!syroAudioBuffer) {
          const { target, nativeEvent } = e;
          // wait until the syro buffer is ready then simulate the event to
          // retry this handler. it's important that we simulate another
          // action because otherwise iOS won't let us play the audio later.
          setCallbackOnSyroBuffer({
            fn: () => target.dispatchEvent(nativeEvent),
          });
        }
        return;
      }
      try {
        setSyroTransferState('transferring');
        const stopPlayback = playAudioBuffer(syroAudioBuffer, {
          onTimeUpdate: (currentTime) =>
            setSyroProgress(currentTime / syroAudioBuffer.duration),
          onEnded: () => setSyroTransferState('idle'),
        });
        stop.current = () => {
          stopPlayback();
          setSyroTransferState('idle');
        };
      } catch (err) {
        console.error(err);
        setSyroTransferState('error');
      }
    },
    [playAudioBuffer, syroAudioBuffer]
  );
  const handleCancel = useCallback(() => stop.current(), []);
  return (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={handleTransfer}
        disabled={
          syroAudioBuffer instanceof Error ||
          syroTransferState === 'transferring'
        }
      >
        Transfer to volca sample
      </Button>
      <br />
      {syroAudioBuffer &&
      syroTransferState === 'idle' ? null : syroTransferState === 'error' ? (
        'Error transferring'
      ) : (
        <>
          <p>
            {!syroAudioBuffer
              ? 'Preparing sample for transfer...'
              : syroAudioBuffer instanceof AudioBuffer
              ? 'Transferring to volca sample...'
              : 'Error preparing sample for transfer'}
          </p>
          <ProgressBar now={100 * syroProgress} />
          <br />
          <Button type="button" variant="light" onClick={handleCancel}>
            Cancel
          </Button>
        </>
      )}
      <br />
    </>
  );
}

export default VolcaTransferControl;

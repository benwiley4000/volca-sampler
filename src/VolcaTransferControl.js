import React, { useEffect, useRef, useState } from 'react';

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
  // to be set when transfer or playback is started
  const stop = useRef(() => {});
  useEffect(() => {
    let cancelled = false;
    setSyroProgress(0);
    setSyroTransferState('idle');
    setSyroAudioBuffer(null);
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
  const { playAudioBuffer, isAudioBusy } = useAudioPlaybackContext();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!(syroAudioBuffer instanceof AudioBuffer)) {
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
        }}
        disabled={
          isAudioBusy ||
          !syroAudioBuffer ||
          syroTransferState === 'transferring'
        }
      >
        transfer to volca sample
      </button>
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
              ? 'Transferring to Volca Sample...'
              : 'Error preparing sample for transfer'}
          </p>
          <progress value={syroProgress} />
          <br />
          <button onClick={() => stop.current()}>Cancel</button>
        </>
      )}
      <br />
    </>
  );
}

export default VolcaTransferControl;

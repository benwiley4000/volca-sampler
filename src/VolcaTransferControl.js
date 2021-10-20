import React, { useEffect, useRef, useState } from 'react';

import {
  getAudioBufferForAudioFileData,
  playAudioBuffer,
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
    /** @type {'loading' | 'transferring' | 'error' | 'idle'} */ ('idle')
  );
  // to be set when transfer is started
  const stop = useRef(() => {});
  useEffect(() => {
    return () => stop.current();
  }, [sample]);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            let cancelled = false;
            stop.current = () => {
              setSyroTransferState('idle');
              cancelled = true;
            };
            setSyroProgress(0);
            setSyroTransferState('loading');
            const sampleBuffer = await getSampleBuffer(sample, setSyroProgress);
            if (cancelled) {
              return;
            }
            setSyroTransferState('transferring');
            const audioBuffer = await getAudioBufferForAudioFileData(
              sampleBuffer
            );
            if (cancelled) {
              return;
            }
            const stopPlayback = playAudioBuffer(audioBuffer, {
              onTimeUpdate: (currentTime) =>
                setSyroProgress(currentTime / audioBuffer.duration),
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
      >
        transfer to volca sample
      </button>
      <br />
      {syroTransferState === 'idle' ? null : syroTransferState === 'error' ? (
        'Error transferring'
      ) : (
        <>
          <p>
            {syroTransferState === 'loading'
              ? 'Preparing sample transfer...'
              : 'Transferring to Volca Sample...'}
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

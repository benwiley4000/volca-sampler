import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button, Modal, ProgressBar } from 'react-bootstrap';

import {
  getAudioBufferForAudioFileData,
  useAudioPlaybackContext,
} from './utils/audioData.js';
import { getSampleBuffer } from './utils/syro.js';
import { formatLongTime } from './utils/datetime';

import classes from './VolcaTransferControl.module.scss';

/**
 * @param {{
 *   sample: import('./store').SampleContainer;
 * }} props
 */
function VolcaTransferControl({ sample }) {
  const [syroProgress, setSyroProgress] = useState(0);
  const [preTransferModalOpen, setPreTransferModalOpen] = useState(false);
  const [syroTransferState, setSyroTransferState] = useState(
    /** @type {'idle' | 'transferring' | 'error'} */ ('idle')
  );
  useLayoutEffect(() => {
    if (syroTransferState === 'transferring') {
      setPreTransferModalOpen(false);
    }
  }, [syroTransferState]);
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
  const transferInProgress = syroProgress < 1;
  return (
    <>
      <Button
        className={classes.transferButton}
        type="button"
        variant="primary"
        onClick={() => setPreTransferModalOpen(true)}
      >
        Transfer to volca sample
      </Button>
      <Modal
        onHide={() => setPreTransferModalOpen(false)}
        className={classes.preTransferModal}
        show={preTransferModalOpen}
        aria-labelledby="pre-transfer-modal"
      >
        <Modal.Header>
          <Modal.Title id="pre-transfer-modal">
            Connect volca sample before continuing
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <figure>
            <img src="connection.png" alt="" />
            <figcaption className="small">
              Source:{' '}
              <a
                href="https://github.com/korginc/volcasample#6-transferring-syrostream-to-your-volca-sample"
                target="_blank"
                rel="noreferrer"
              >
                KORG
              </a>
            </figcaption>
          </figure>
          <p>
            Make sure your <strong>headphone output</strong> is connected to the
            volca sample's <strong>SYNC IN</strong> and adjust your output
            volume to a high (but not overdriven) level. Your volca wants to
            hear this, but you don't.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="light"
            onClick={() => setPreTransferModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!(syroAudioBuffer instanceof AudioBuffer)}
            onClick={handleTransfer}
          >
            Transfer now
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        onHide={transferInProgress ? undefined : handleCancel}
        show={syroTransferState !== 'idle'}
        aria-labelledby="transfer-modal"
      >
        <Modal.Header>
          <Modal.Title id="transfer-modal">
            {transferInProgress
              ? 'Sample transfer in progress'
              : 'Sample transfer complete'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {syroTransferState === 'error' ? (
            <p>
              Something unexpected happening while transferring (on our end).
            </p>
          ) : transferInProgress ? (
            <>
              <p>
                Transferring <strong>{sample.metadata.name}</strong> to slot{' '}
                <strong>{sample.metadata.slotNumber}</strong> on your your volca
                sample. Don't disconnect anything.
              </p>
              <ProgressBar
                striped
                animated
                variant="primary"
                now={100 * syroProgress}
              />
              <div className={classes.progressAnnotation}>
                {syroAudioBuffer instanceof AudioBuffer &&
                  formatLongTime(
                    syroAudioBuffer.duration * (1 - syroProgress)
                  )}{' '}
                remaining
              </div>
            </>
          ) : (
            <>
              <p>
                The sample <strong>{sample.metadata.name}</strong> was
                transferred to slot{' '}
                <strong>{sample.metadata.slotNumber}</strong> on your volca
                sample. If everything worked, you will see{' '}
                <strong>[End]</strong> on the volca sample's display. Press the{' '}
                <strong>[FUNC]</strong> button to finish.
              </p>
              <p>
                If you see <strong>[Err]</strong> on the display, the transfer
                failed. Normally this means you need to adjust your output
                volume or free up some memory on the volca sample, then try
                again. For more info, check out this{' '}
                <a
                  href="https://www.korg.com/products/dj/volca_sample/faq.php"
                  target="_blank"
                  rel="noreferrer"
                >
                  FAQ
                </a>{' '}
                from KORG.
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="primary" onClick={handleCancel}>
            {transferInProgress ? 'Cancel' : 'Done'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default VolcaTransferControl;

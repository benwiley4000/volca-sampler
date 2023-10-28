import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Modal, ProgressBar } from 'react-bootstrap';
import byteSize from 'byte-size';

import {
  getAudioBufferForAudioFileData,
  useAudioPlaybackContext,
} from './utils/audioData.js';
import { getSyroSampleBuffer } from './utils/syro.js';
import { formatLongTime, formatShortTime } from './utils/datetime';
import { SAMPLE_RATE } from './utils/constants.js';

import classes from './VolcaTransferControl.module.scss';
import SlotNumberInput from './SlotNumberInput.js';
import SampleSelectionTable from './SampleSelectionTable.js';

/**
 * @typedef {import('./store').SampleContainer} SampleContainer
 * @typedef {import('./sampleCacheStore.js').SampleCache} SampleCache
 * @param {{
 *   samples: (SampleContainer)[] | SampleContainer;
 *   sampleCaches: Map<string, SampleCache>;
 *   justTheButton?: boolean;
 *   showInfoBeforeTransfer?: boolean;
 *   button?: React.ReactElement;
 *   onSlotNumberUpdate?: (update: number | ((slotNumber: number) => number)) => void;
 * }} props
 */
function VolcaTransferControl({
  samples: _samples,
  sampleCaches,
  justTheButton,
  showInfoBeforeTransfer,
  button,
  onSlotNumberUpdate,
}) {
  const samples = useMemo(
    () => (_samples instanceof Array ? _samples : [_samples]),
    [_samples]
  );
  const samplesMap = useMemo(() => {
    return new Map(samples.map((s) => [s.id, s]));
  }, [samples]);
  const [selectedSamples, setSelectedSamples] = useState(samplesMap);
  useEffect(() => {
    setSelectedSamples(samplesMap);
  }, [samplesMap]);
  const selectedSampleIds = useMemo(() => {
    return new Set(selectedSamples.keys());
  }, [selectedSamples]);
  const setSelectedSampleIds = useCallback(
    /** @param {(prevIds: Set<string>) => Set<string>} updater */
    (updater) => {
      setSelectedSamples(
        (selectedSamples) =>
          new Map(
            samples
              .filter((s) => updater(new Set(selectedSamples.keys())).has(s.id))
              .map((s) => [s.id, s])
          )
      );
    },
    [samples]
  );

  const totalSourceDuration = useMemo(() => {
    let duration = 0;
    for (const [id] of selectedSamples) {
      const sampleCache = sampleCaches.get(id);
      if (sampleCache) {
        duration += sampleCache.cachedInfo.duration;
      }
    }
    return duration;
  }, [selectedSamples, sampleCaches]);

  const duplicateSlots = useMemo(() => {
    /** @type {Map<number, number>}  */
    const slotCounts = new Map();
    for (const [, sample] of selectedSamples) {
      const { slotNumber } = sample.metadata;
      slotCounts.set(slotNumber, (slotCounts.get(slotNumber) || 0) + 1);
    }
    return [...slotCounts]
      .filter(([_, count]) => count > 1)
      .map(([slotNumber]) => slotNumber);
  }, [selectedSamples]);

  const sampleIdsWithPluginFails = useMemo(() => {
    /** @type {string[]}  */
    const sampleIdsWithPluginFails = [];
    for (const [id] of selectedSamples) {
      const sampleCache = sampleCaches.get(id);
      if (sampleCache && sampleCache.cachedInfo.failedPluginIndex > -1) {
        sampleIdsWithPluginFails.push(id);
      }
    }
    return sampleIdsWithPluginFails;
  }, [selectedSamples, sampleCaches]);

  const [syroProgress, setSyroProgress] = useState(1);
  const [transferProgress, setTransferProgress] = useState(0);
  const [infoBeforeTransferModalOpen, setInfoBeforeTransferModalOpen] =
    useState(false);
  const [preTransferModalOpen, setPreTransferModalOpen] = useState(false);
  const [syroTransferState, setSyroTransferState] = useState(
    /** @type {'idle' | 'transferring' | 'error'} */ ('idle')
  );
  useLayoutEffect(() => {
    if (syroTransferState === 'transferring') {
      setPreTransferModalOpen(false);
      return () => {
        // reset progress for next time modal is open
        setTimeout(() => setTransferProgress(0), 100);
      };
    }
  }, [syroTransferState]);
  const targetWavDataSize = useMemo(() => {
    let size = selectedSamples.size * 44;
    for (const [id] of selectedSamples) {
      const sampleCache = sampleCaches.get(id);
      if (sampleCache) {
        size += sampleCache.cachedInfo.duration * SAMPLE_RATE * 2; // 16-bit
      }
    }
    return size;
  }, [selectedSamples, sampleCaches]);
  const [dataStartPoints, setDataStartPoints] = useState(
    /** @type {number[]} */ ([])
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
  const canTransferSamples = Boolean(
    selectedSamples.size &&
      !duplicateSlots.length &&
      !sampleIdsWithPluginFails.length &&
      selectedSamples.size <= 110
  );
  useEffect(() => {
    if (!canTransferSamples) return;
    let cancelled = false;
    setSyroProgress(0);
    setSyroTransferState('idle');
    setSyroAudioBuffer(null);
    setCallbackOnSyroBuffer(null);
    stop.current = () => {
      cancelled = true;
    };
    try {
      const { syroBufferPromise, cancelWork } = getSyroSampleBuffer(
        [...selectedSamples.values()],
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
      syroBufferPromise.then(async ({ syroBuffer, dataStartPoints }) => {
        if (cancelled) {
          return;
        }
        stop.current = () => {
          cancelled = true;
        };
        setDataStartPoints(dataStartPoints.map((p) => p / syroBuffer.length));
        const audioBuffer = await getAudioBufferForAudioFileData(syroBuffer);
        console.log(audioBuffer);
        if (!cancelled) {
          setSyroAudioBuffer(audioBuffer);
        }
      });
    } catch (err) {
      console.error(err);
      setSyroAudioBuffer(new Error(String(err)));
    }
    return () => stop.current();
  }, [selectedSamples, canTransferSamples]);
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
            setTransferProgress(currentTime / syroAudioBuffer.duration),
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
  const transferInProgress =
    syroTransferState === 'transferring' && transferProgress < 1;

  const transferInfo = (
    <>
      <div>
        <strong>Sample length:</strong>{' '}
        {formatShortTime(totalSourceDuration, 2)}
      </div>
      <div>
        <strong>Memory footprint:</strong>{' '}
        {byteSize(targetWavDataSize).toString()}
      </div>
      <div>
        <strong>Time to transfer:</strong>{' '}
        {syroAudioBuffer instanceof AudioBuffer ? (
          formatLongTime(syroAudioBuffer.duration)
        ) : syroAudioBuffer instanceof Error ? (
          'error'
        ) : (
          <i>
            <small>
              Checking..{' '}
              {syroProgress && totalSourceDuration >= 10
                ? `${(syroProgress * 100).toFixed(0)}%`
                : ''}
            </small>
          </i>
        )}
      </div>
    </>
  );

  const {
    currentlyTransferringSample,
    currentSampleProgress,
    timeLeftUntilNextSample,
  } = useMemo(() => {
    const selectedSampleList = [...selectedSamples.values()];
    if (
      syroTransferState !== 'transferring' ||
      !(syroAudioBuffer instanceof AudioBuffer)
    ) {
      return {
        currentlyTransferringSample: selectedSampleList[0],
        currentSampleProgress: 0,
        timeLeftUntilNextSample: 0,
      };
    }
    const foundIndex =
      dataStartPoints.findIndex((p) => p > transferProgress) - 1;
    const currentlyTransferringSampleIndex =
      foundIndex >= 0 ? foundIndex : selectedSampleList.length - 1;
    const currentlyTransferringSample =
      selectedSampleList[currentlyTransferringSampleIndex];
    const currentStartPoint = dataStartPoints[currentlyTransferringSampleIndex];
    const nextStartPoint =
      dataStartPoints[currentlyTransferringSampleIndex + 1] || 1;
    const currentSampleProgress =
      (transferProgress - currentStartPoint) /
      (nextStartPoint - currentStartPoint);
    const timeLeftUntilNextSample =
      (nextStartPoint - transferProgress) * syroAudioBuffer.duration;
    return {
      currentlyTransferringSample,
      currentSampleProgress,
      timeLeftUntilNextSample,
    };
  }, [
    selectedSamples,
    dataStartPoints,
    syroTransferState,
    transferProgress,
    syroAudioBuffer,
  ]);

  return (
    <>
      {!justTheButton && (
        <>
          <div className={classes.transferInfoBox}>{transferInfo}</div>
          <SlotNumberInput
            slotNumber={samples[0].metadata.slotNumber}
            onSlotNumberUpdate={
              /** @type {NonNullable<typeof onSlotNumberUpdate>} */ (
                onSlotNumberUpdate
              )
            }
          />
        </>
      )}
      {React.cloneElement(
        button || (
          <Button
            className={classes.transferButton}
            type="button"
            variant="primary"
          >
            Transfer to volca sample
          </Button>
        ),
        {
          onClick() {
            if (showInfoBeforeTransfer) {
              setInfoBeforeTransferModalOpen(true);
            } else {
              setPreTransferModalOpen(true);
            }
          },
        }
      )}
      <Modal
        onHide={() => setInfoBeforeTransferModalOpen(false)}
        className={classes.preTransferModal}
        show={infoBeforeTransferModalOpen}
        aria-labelledby="info-before-transfer-modal"
      >
        <Modal.Header>
          <Modal.Title id="info-before-modal">
            Confirm samples to be transferred
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className={classes.summary}>
            <p
              className={[
                classes.transferInfoForModal,
                canTransferSamples ? '' : classes.cannotTransfer,
              ].join(' ')}
            >
              {transferInfo}
            </p>
            {!canTransferSamples && (
              <div className={classes.errors}>
                {duplicateSlots.length > 0 ? (
                  <p className={classes.invalidMessage}>
                    You cannot transfer multiple samples to the same slot (slot
                    {duplicateSlots.length > 1 && 's'}{' '}
                    <strong>{duplicateSlots.join(', ')}</strong>).
                  </p>
                ) : sampleIdsWithPluginFails.length > 0 ? (
                  <p className={classes.invalidMessage}>
                    Please fix or unselect samples with broken plugins.
                  </p>
                ) : !selectedSamples.size ? (
                  <p className={classes.invalidMessage}>
                    You must select at least one sample to transfer.
                  </p>
                ) : selectedSamples.size > 110 ? (
                  <p className={classes.invalidMessage}>
                    You cannot transfer more than <strong>110</strong> samples
                    at once.
                  </p>
                ) : null}{' '}
              </div>
            )}
          </div>
          <SampleSelectionTable
            samples={samplesMap}
            selectedSampleIds={selectedSampleIds}
            setSelectedSampleIds={setSelectedSampleIds}
            sampleIdsWithPluginFails={sampleIdsWithPluginFails}
            highlightDuplicateSlots
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="light"
            onClick={() => setInfoBeforeTransferModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={
              !(syroAudioBuffer instanceof AudioBuffer) || !canTransferSamples
            }
            onClick={() => {
              setPreTransferModalOpen(true);
              setInfoBeforeTransferModalOpen(false);
            }}
          >
            Continue
          </Button>
        </Modal.Footer>
      </Modal>
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
      <Modal show={transferInProgress} aria-labelledby="transfer-modal">
        <Modal.Header>
          <Modal.Title id="transfer-modal">
            Sample transfer in progress
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSamples.size > 1 ? (
            <p>
              Transferring <strong>{selectedSamples.size} samples</strong> to
              your volca sample. Don't disconnect anything.
            </p>
          ) : [...selectedSamples.values()][0] ? (
            <p>
              Transferring{' '}
              <strong>{[...selectedSamples.values()][0].metadata.name}</strong>{' '}
              to slot{' '}
              <strong>
                {[...selectedSamples.values()][0].metadata.slotNumber}
              </strong>{' '}
              on your volca sample. Don't disconnect anything.
            </p>
          ) : null}
          <ProgressBar
            striped
            animated
            variant="primary"
            now={100 * transferProgress}
          />
          <div className={classes.progressAnnotation}>
            {syroAudioBuffer instanceof AudioBuffer &&
              formatLongTime(
                syroAudioBuffer.duration * (1 - transferProgress)
              )}{' '}
            remaining
          </div>
          {selectedSamples.size > 1 && (
            <div className={classes.subtask}>
              <p>
                (
                {[...selectedSamples.values()].indexOf(
                  currentlyTransferringSample
                ) + 1}
                /{selectedSamples.size}){' '}
                <strong className={classes.name}>
                  {currentlyTransferringSample.metadata.name}
                </strong>{' '}
                to slot{' '}
                <strong>
                  {currentlyTransferringSample.metadata.slotNumber}
                </strong>
              </p>
              <ProgressBar
                className={classes.secondaryProgress}
                variant="primary"
                now={100 * currentSampleProgress}
              />
              <div className={classes.progressAnnotation}>
                {formatLongTime(timeLeftUntilNextSample)} remaining
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="primary" onClick={handleCancel}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        onHide={handleCancel}
        show={syroTransferState !== 'idle' && !transferInProgress}
        aria-labelledby="after-transfer-modal"
      >
        <Modal.Header>
          <Modal.Title id="after-transfer-modal">
            {syroTransferState === 'error'
              ? 'Error transferring'
              : 'Sample transfer complete'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {syroTransferState === 'error' ? (
            <p>
              Something unexpected happening while transferring (on our end).
            </p>
          ) : (
            <>
              {selectedSamples.size > 1 ? (
                <p>Your samples were transferred to your volca sample.</p>
              ) : [...selectedSamples.values()][0] ? (
                <p>
                  <strong>
                    {[...selectedSamples.values()][0].metadata.name}
                  </strong>{' '}
                  was transferred to slot{' '}
                  <strong>
                    {[...selectedSamples.values()][0].metadata.slotNumber}
                  </strong>{' '}
                  on your volca sample.
                </p>
              ) : null}
              <h5>
                If you see <strong>[End]</strong>:
              </h5>
              <p>
                The transfer was successful. Press the blinking{' '}
                <strong>[FUNC]</strong> button to finish.
              </p>
              <h5>
                If you see <strong>[Err dcod]</strong>:
              </h5>
              <p>
                Check your volume level and make sure no other application is
                creating noise, then try again. If your volume is at a decent
                level but the transfer failed, you might also want to try a new
                audio cable.
              </p>
              <h5>
                If you see <strong>[Err FuLL]</strong>:
              </h5>
              <p>
                Free up some memory on the volca sample (or cut down your sample
                size), then try again.
              </p>
              <p>
                For more info, check out this{' '}
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
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default VolcaTransferControl;

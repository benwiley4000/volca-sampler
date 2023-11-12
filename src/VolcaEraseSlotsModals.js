import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Form, Modal, ProgressBar } from 'react-bootstrap';
import RangeSlider from 'react-bootstrap-range-slider';

import { getSyroDeleteBuffer, useSyroTransfer } from './utils/syro.js';
import { formatLongTime } from './utils/datetime.js';

import classes from './VolcaEraseSlotsModals.module.scss';

const VolcaEraseSlotsControl = React.memo(
  /**
   * @param {{
   *   isInfoBeforeEraseModalOpen: boolean;
   *   setIsInfoBeforeEraseModalOpen(value: boolean): void;
   * }} props
   */
  function VolcaEraseSlotsControl({
    isInfoBeforeEraseModalOpen,
    setIsInfoBeforeEraseModalOpen,
  }) {
    const [isPreEraseModalOpen, setIsPreEraseModalOpen] = useState(false);
    const [slotEraseRange, setSampleEraseRange] = useState(
      /** @type {[number, number]} */ ([0, 99])
    );
    useLayoutEffect(() => {
      if (isInfoBeforeEraseModalOpen) {
        setSampleEraseRange([0, 99]);
      }
    }, [isInfoBeforeEraseModalOpen]);

    const [{ syroBuffer, dataStartPoints }, setSyroBufferAndDataStartPoints] =
      useState({
        syroBuffer: /** @type {Uint8Array | Error | null} */ (null),
        dataStartPoints: /** @type {number[]} */ ([]),
      });

    const slotNumbers = useMemo(() => {
      return Array(200)
        .fill(0)
        .map((_, i) => i)
        .slice(slotEraseRange[0], slotEraseRange[1] + 1);
    }, [slotEraseRange]);
    console.log(syroBuffer);
    /** @type {React.RefObject<HTMLInputElement>} */
    const rangeMinInputRef = useRef(null);
    /** @type {React.RefObject<HTMLInputElement>} */
    const rangeMaxInputRef = useRef(null);
    /** @type {React.RefObject<HTMLInputElement>} */
    const numberMinInputRef = useRef(null);
    /** @type {React.RefObject<HTMLInputElement>} */
    const numberMaxInputRef = useRef(null);
    const slotNumbersRef = useRef(slotNumbers);
    slotNumbersRef.current = slotNumbers;
    let lastOnChangeEndEventRef = useRef(new Event(''));
    useEffect(() => {
      /** @param {Event} e */
      const onChangeEnd = (e) => {
        lastOnChangeEndEventRef.current = e;
        setSyroBufferAndDataStartPoints({
          syroBuffer: null,
          dataStartPoints: [],
        });
        console.log('getting delete buffer');
        getSyroDeleteBuffer(slotNumbers).then((result) => {
          if (lastOnChangeEndEventRef.current === e) {
            setSyroBufferAndDataStartPoints(result);
          }
        });
      };
      const refs = [
        rangeMinInputRef,
        rangeMaxInputRef,
        numberMinInputRef,
        numberMaxInputRef,
      ];
      for (const ref of refs) {
        const input = ref.current;
        if (input) {
          input.addEventListener('change', onChangeEnd);
        }
      }
      return () => {
        for (const ref of refs) {
          const input = ref.current;
          if (input) {
            input.removeEventListener('change', onChangeEnd);
          }
        }
      };
    }, []);

    const {
      currentItemProgress,
      currentlyTransferringItem,
      syroTransferState,
      timeLeftUntilNextItem,
      transferInProgress,
      transferProgress,
      syroAudioBuffer,
      startTransfer,
      stopTransfer,
    } = useSyroTransfer({
      syroBuffer,
      dataStartPoints,
      selectedItems: slotNumbers,
    });

    const leftRatio = slotEraseRange[0] / 199;
    const rightRatio = (199 - slotEraseRange[1]) / 199;

    return (
      <>
        <Modal
          onHide={() => setIsInfoBeforeEraseModalOpen(false)}
          className={classes.preTransferModal}
          show={isInfoBeforeEraseModalOpen}
          aria-labelledby="info-before-erase-modal"
        >
          <Modal.Header>
            <Modal.Title id="info-before-erase-modal">
              Choose slots to erase on volca sample
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>The following range of slots (inclusive) will be erased:</p>
            {['Min', 'Max'].map((label) => {
              const value = slotEraseRange[label === 'Min' ? 0 : 1];
              /** @param {React.ChangeEvent<HTMLInputElement>} e */
              const onChange = (e) => {
                const value = Number(e.target.value);
                console.log(value);
                console.log(value);
                setSampleEraseRange((range) =>
                  label === 'Min'
                    ? [value, range[1] < value ? value : range[1]]
                    : [range[0] > value ? value : range[0], value]
                );
              };
              return (
                <Form.Group className={classes.paramControl}>
                  <div className={classes.paramControlInputGroup} key={label}>
                    <div>
                      <Form.Label>{label}</Form.Label>
                      <RangeSlider
                        ref={
                          label === 'Min' ? rangeMinInputRef : rangeMaxInputRef
                        }
                        style={{
                          '--left-percentage': `${leftRatio * 100}%`,
                          '--right-percentage': `${rightRatio * 100}%`,
                        }}
                        className={classes.slotRangeSlider}
                        value={value}
                        min={0}
                        max={199}
                        step={1}
                        onChange={onChange}
                        tooltip="off"
                      />
                    </div>
                    <Form.Control
                      ref={
                        label === 'Min' ? numberMinInputRef : numberMaxInputRef
                      }
                      type="number"
                      value={value}
                      min={0}
                      max={199}
                      step={1}
                      onChange={onChange}
                    />
                  </div>
                </Form.Group>
              );
            })}
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="light"
              onClick={() => setIsInfoBeforeEraseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setIsPreEraseModalOpen(true);
                setIsInfoBeforeEraseModalOpen(false);
              }}
            >
              Continue
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal
          onHide={() => setIsPreEraseModalOpen(false)}
          className={classes.preTransferModal}
          show={isPreEraseModalOpen}
          aria-labelledby="pre-erase-modal"
        >
          <Modal.Header>
            <Modal.Title id="pre-erase-modal">
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
              Make sure your <strong>headphone output</strong> is connected to
              the volca sample's <strong>SYNC IN</strong> and adjust your output
              volume to a high (but not overdriven) level. Your volca wants to
              hear this, but you don't.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="light"
              onClick={() => setIsPreEraseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!(syroAudioBuffer instanceof AudioBuffer)}
              onClick={startTransfer}
            >
              Erase slots now
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal show={transferInProgress} aria-labelledby="erase-modal">
          <Modal.Header>
            <Modal.Title id="transfer-modal">
              Erasing slots on volca sample
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Erasing <strong>{slotNumbers.length} slots</strong> on your volca
              sample. Don't disconnect anything.
            </p>
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
            {slotNumbers.length > 1 && (
              <div className={classes.subtask}>
                <p>
                  ({slotNumbers.indexOf(currentlyTransferringItem) + 1}/
                  {slotNumbers.length}) Erasing slot{' '}
                  <strong>{currentlyTransferringItem}</strong>
                </p>
                <ProgressBar
                  className={classes.secondaryProgress}
                  variant="primary"
                  now={100 * currentItemProgress}
                />
                <div className={classes.progressAnnotation}>
                  {formatLongTime(timeLeftUntilNextItem)} remaining
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="primary" onClick={stopTransfer}>
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal
          onHide={stopTransfer}
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
              <p>Something unexpected happening while erasing (on our end).</p>
            ) : (
              <>
                <p>
                  Slots <strong>{slotEraseRange[0]}</strong>-
                  <strong>{slotEraseRange[1]}</strong> were erased on your volca
                  sample.
                </p>
                <h5>
                  If you see <strong>[End]</strong>:
                </h5>
                <p>
                  The operation was successful. Press the blinking{' '}
                  <strong>[FUNC]</strong> button to finish.
                </p>
                <h5>
                  If you see <strong>[Err dcod]</strong>:
                </h5>
                <p>
                  Check your volume level and make sure no other application is
                  creating noise, then try again. If your volume is at a decent
                  level but the transfer failed, you might also want to try a
                  new audio cable.
                </p>
                <h5>
                  If you see <strong>[Err PArA]</strong>:
                </h5>
                <p>
                  This will happen if you try to erase a slot above 99 on the
                  original volca sample. More slots are available on the volca
                  sample2.
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
            <Button type="button" variant="primary" onClick={stopTransfer}>
              Done
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
);

export default VolcaEraseSlotsControl;

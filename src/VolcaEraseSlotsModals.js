import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Button,
  ButtonGroup,
  Modal,
  ProgressBar,
  Table,
  ToggleButton,
} from 'react-bootstrap';

import { getSyroDeleteBuffer, useSyroTransfer } from './utils/syro.js';
import { formatLongTime } from './utils/datetime.js';

import classes from './VolcaEraseSlotsModals.module.scss';

const VolcaEraseSlotsModals = React.memo(
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
    const [selectedSlotNumbers, setSelectedSlotNumbers] = useState(
      /** @type {Set<number>} */ (new Set())
    );
    useLayoutEffect(() => {
      if (isInfoBeforeEraseModalOpen) {
        setSelectedSlotNumbers(new Set());
      }
    }, [isInfoBeforeEraseModalOpen]);

    const [showSample2SlotNumbers, setShowSample2SlotNumbers] = useState(false);

    useEffect(() => {
      if (!showSample2SlotNumbers) {
        setSelectedSlotNumbers((selectedSlotNumbers) => {
          const newSelectedSlotNumbers = new Set(selectedSlotNumbers);
          for (let i = 100; i < 200; i++) {
            newSelectedSlotNumbers.delete(i);
          }
          return newSelectedSlotNumbers;
        });
      }
    }, [showSample2SlotNumbers]);

    const [{ syroBuffer, dataStartPoints }, setSyroBufferAndDataStartPoints] =
      useState({
        syroBuffer: /** @type {Uint8Array | Error | null} */ (null),
        dataStartPoints: /** @type {number[]} */ ([]),
      });

    const slotNumbers = useMemo(
      () => [...selectedSlotNumbers],
      [selectedSlotNumbers]
    );

    useEffect(() => {
      setSyroBufferAndDataStartPoints({
        syroBuffer: null,
        dataStartPoints: [],
      });
      if (slotNumbers.length === 0) return;
      let cancelled = false;
      getSyroDeleteBuffer(slotNumbers).then((result) => {
        if (!cancelled) {
          setSyroBufferAndDataStartPoints(result);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [slotNumbers]);

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

    const allChecked = Array(showSample2SlotNumbers ? 200 : 100)
      .fill(0)
      .every((_, i) => selectedSlotNumbers.has(i));
    const noneChecked = !selectedSlotNumbers.size;
    const indeterminate = !allChecked && !noneChecked;
    /** @type {React.RefObject<HTMLInputElement>} */
    const globalCheckboxRef = useRef(null);
    if (globalCheckboxRef.current) {
      globalCheckboxRef.current.indeterminate = indeterminate;
    }

    const [rowCheckboxRefs] = useState(() =>
      Array(20)
        .fill(0)
        .map(
          () =>
            /** @type {React.RefObject<HTMLInputElement>} */ (React.createRef())
        )
    );
    const rowsInfo = rowCheckboxRefs.map((_, i) => {
      const rowStartSlot = i * 10;
      let noneChecked = true;
      let allChecked = true;
      for (let j = rowStartSlot; j < rowStartSlot + 10; j++) {
        if (selectedSlotNumbers.has(j)) {
          noneChecked = false;
        } else {
          allChecked = false;
        }
      }
      const indeterminate = !noneChecked && !allChecked;
      return { noneChecked, indeterminate };
    });
    rowCheckboxRefs.forEach((ref, i) => {
      if (ref.current) {
        ref.current.indeterminate = rowsInfo[i].indeterminate;
      }
    });

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
            <p>
              Using this app to erase slots can be useful if you have corrupted
              data or a lot of data to erase. Other times it can be simpler to{' '}
              <strong>erase slots directly using the volca sample</strong>. KORG
              has a detailed guide{' '}
              <a
                href="https://cdn.korg.com/us/support/download/files/6f825a395967a756aabbbff7ef8414a1.pdf?response-content-disposition=inline%3Bfilename%3Dvolca_sample_Deleting_sample_E1.pdf&response-content-type=application%2Fpdf%3B#:~:text=Deleting%20a%20sample%20from%20the%20volca%20sample&text=Use%20the%20SAMPLE%20selector%20to,button%20to%20cancel%20the%20marking."
                target="_blank"
                rel="noreferrer"
              >
                here
              </a>
              .
            </p>
            <p>
              <strong>{selectedSlotNumbers.size} slots</strong> are selected.
              <br />
              <strong>Time to erase:</strong>{' '}
              {syroAudioBuffer instanceof AudioBuffer ? (
                formatLongTime(syroAudioBuffer.duration)
              ) : syroAudioBuffer instanceof Error ? (
                'error'
              ) : (
                <i>
                  <small>
                    {selectedSlotNumbers.size
                      ? 'Checking..'
                      : 'Make a selection.'}
                  </small>
                </i>
              )}
            </p>
            <p>
              <label>Show slots:</label>
              <br />
              <ButtonGroup>
                <ToggleButton
                  id="show-sample-1-slots"
                  type="radio"
                  size="sm"
                  name="show-sample-1-slots"
                  value="false"
                  variant="outline-secondary"
                  checked={!showSample2SlotNumbers}
                  onClick={() => {
                    setShowSample2SlotNumbers(false);
                  }}
                >
                  0-99 (volca sample)
                </ToggleButton>
                <ToggleButton
                  id="show-sample-2-slots"
                  type="radio"
                  size="sm"
                  name="show-sample-2-slots"
                  value="true"
                  variant="outline-secondary"
                  checked={showSample2SlotNumbers}
                  onClick={() => {
                    setShowSample2SlotNumbers(true);
                  }}
                >
                  0-199 (sample2)
                </ToggleButton>
              </ButtonGroup>
            </p>
            <Table className={classes.slotNumbersTable}>
              <thead>
                <tr>
                  <th className={classes.check}>
                    <input
                      ref={globalCheckboxRef}
                      type="checkbox"
                      checked={!noneChecked}
                      onChange={(e) => {
                        setSelectedSlotNumbers((selectedSlotNumbers) => {
                          const newSelectedSlotNumbers = new Set(
                            selectedSlotNumbers
                          );
                          const limit = showSample2SlotNumbers ? 200 : 100;
                          if (e.target.checked) {
                            for (let i = 0; i < limit; i++) {
                              newSelectedSlotNumbers.add(i);
                            }
                          } else {
                            for (let i = 0; i < limit; i++) {
                              newSelectedSlotNumbers.delete(i);
                            }
                          }
                          return newSelectedSlotNumbers;
                        });
                      }}
                    />
                  </th>
                  <th className={classes.rangeLabels}>Range</th>
                  {Array(10)
                    .fill(0)
                    .map((_, i) => (
                      <th className={classes.individualCheck}>{i}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {Array(showSample2SlotNumbers ? 20 : 10)
                  .fill(0)
                  .map((_, i) => {
                    const rowStartSlot = i * 10;
                    return (
                      <tr key={String(i)}>
                        <td>
                          <input
                            ref={rowCheckboxRefs[i]}
                            type="checkbox"
                            checked={!rowsInfo[i].noneChecked}
                            onChange={(e) => {
                              setSelectedSlotNumbers((selectedSlotNumbers) => {
                                const newSelectedSlotNumbers = new Set(
                                  selectedSlotNumbers
                                );
                                if (e.target.checked) {
                                  for (
                                    let i = rowStartSlot;
                                    i < rowStartSlot + 10;
                                    i++
                                  ) {
                                    newSelectedSlotNumbers.add(i);
                                  }
                                } else {
                                  for (
                                    let i = rowStartSlot;
                                    i < rowStartSlot + 10;
                                    i++
                                  ) {
                                    newSelectedSlotNumbers.delete(i);
                                  }
                                }
                                return newSelectedSlotNumbers;
                              });
                            }}
                          />
                        </td>
                        <th>
                          {rowStartSlot}-{rowStartSlot + 9}
                        </th>
                        {Array(10)
                          .fill(0)
                          .map((_, i) => {
                            const slotNumber = rowStartSlot + i;
                            return (
                              <td key={String(i)}>
                                <input
                                  type="checkbox"
                                  title={String(slotNumber)}
                                  checked={selectedSlotNumbers.has(slotNumber)}
                                  onChange={(e) => {
                                    setSelectedSlotNumbers(
                                      (selectedSlotNumbers) => {
                                        const newSelectedSlotNumbers = new Set(
                                          selectedSlotNumbers
                                        );
                                        if (e.target.checked) {
                                          newSelectedSlotNumbers.add(
                                            slotNumber
                                          );
                                        } else {
                                          newSelectedSlotNumbers.delete(
                                            slotNumber
                                          );
                                        }
                                        return newSelectedSlotNumbers;
                                      }
                                    );
                                  }}
                                />
                              </td>
                            );
                          })}
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
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
              disabled={!selectedSlotNumbers.size}
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
              onClick={(e) => {
                startTransfer(e);
                setIsPreEraseModalOpen(false);
              }}
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
                  Slots <strong>{slotNumbers.join(', ')}</strong> were erased on
                  your volca sample.
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
                  Check your volume level, and make sure no other application is
                  creating noise or applying any EQ or resampling to your audio,
                  then try again. If your volume is at a decent level (not
                  overdriven and not too soft) but the transfer still fails, you
                  might also want to try a new audio cable.
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

export default VolcaEraseSlotsModals;

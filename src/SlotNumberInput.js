import React, { useCallback, useEffect, useRef, useState } from 'react';
import SevenSegmentDisplay, { Digit } from 'seven-segment-display';
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { findDOMNode } from 'react-dom';
import keyboardArrowUpIcon from '@material-design-icons/svg/filled/keyboard_arrow_up.svg';
import keyboardArrowDownIcon from '@material-design-icons/svg/filled/keyboard_arrow_down.svg';
import warningIcon from '@material-design-icons/svg/filled/warning.svg';

import classes from './SlotNumberInput.module.scss';

Digit.defaultProps.offOpacity = 0;

/** @typedef {(slotNumber: number) => number} SlotNumberCallback */

/**
 * @param {0 | 1 | 2} digit
 * @param {number} slotNumber
 * */
const arrowUpCallback = (digit, slotNumber) =>
  Math.min(199, slotNumber + 10 ** digit);

/**
 * @param {0 | 1 | 2} digit
 * @param {number} slotNumber
 * */
const arrowDownCallback = (digit, slotNumber) =>
  Math.max(0, slotNumber - 10 ** digit);

/**
 * @param {{
 *   sample: import('./store').SampleContainer
 *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
 * }} props
 */
function SlotNumberInput({ sample, onSampleUpdate }) {
  const [slotNumberLocal, setSlotNumberLocal] = useState(
    sample.metadata.slotNumber
  );
  useEffect(() => {
    setSlotNumberLocal(sample.metadata.slotNumber);
  }, [sample.metadata.slotNumber]);

  // 0 is 0-9, 1 is 0-90, 2 is 0-200
  const [focusedDigit, setFocusedDigit] = useState(
    /** @type {0 | 1 | 2 | null} */ (null)
  );

  /** @type {(digit: 0 | 1 | 2) => void} */
  const handleArrowUp = useCallback(
    (digit) => {
      onSampleUpdate(sample.id, ({ slotNumber }) => ({
        slotNumber: arrowUpCallback(digit, slotNumber),
      }));
    },
    [sample.id, onSampleUpdate]
  );

  /** @type {(digit: 0 | 1 | 2) => void} */
  const handleArrowDown = useCallback(
    (digit) => {
      onSampleUpdate(sample.id, ({ slotNumber }) => ({
        slotNumber: arrowDownCallback(digit, slotNumber),
      }));
    },
    [sample.id, onSampleUpdate]
  );

  /**
   * @type {React.RefObject<HTMLDivElement>}
   */
  const slotNumberRef = useRef(null);
  const digitElementsRef = useRef(/** @type {SVGGElement[] | null} */ (null));
  {
    const focusedDigitRef = useRef(focusedDigit);
    focusedDigitRef.current = focusedDigit;
    const sampleIdRef = useRef(sample.id);
    sampleIdRef.current = sample.id;
    const slotNumberLocalRef = useRef(slotNumberLocal);
    slotNumberLocalRef.current = slotNumberLocal;
    useEffect(() => {
      if (!digitElementsRef.current) {
        throw new Error('Expected elements to exist');
      }
      /** @param {KeyboardEvent} e */
      function onKeyDown(e) {
        const focusedDigit = focusedDigitRef.current;
        if (focusedDigit === null) {
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        switch (e.key) {
          // slot number down
          case 'ArrowDown':
            setSlotNumberLocal((slotNumber) =>
              arrowDownCallback(focusedDigit, slotNumber)
            );
            break;
          // slot number up
          case 'ArrowUp':
            setSlotNumberLocal((slotNumber) =>
              arrowUpCallback(focusedDigit, slotNumber)
            );
            break;
          // digit navigation left
          case 'ArrowLeft':
            setFocusedDigit((digit) =>
              digit !== null && digit < 2
                ? /** @type {1 | 2} */ (digit + 1)
                : digit
            );
            break;
          // digit navigation right
          case 'ArrowRight':
            setFocusedDigit((digit) =>
              digit ? /** @type {0 | 1} */ (digit - 1) : digit
            );
            break;
          case 'Enter':
          case 'Escape':
            setFocusedDigit(null);
            break;
          default:
            break;
        }
      }
      /** @param {KeyboardEvent} e */
      function onKeyUp(e) {
        const focusedDigit = focusedDigitRef.current;
        if (focusedDigit === null) {
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        const slotNumber = slotNumberLocalRef.current;
        if (!isNaN(Number(e.key))) {
          // numberPressed is a digit 0-9
          const chars = String(slotNumber).padStart(3, '0').split('');
          chars[2 - focusedDigit] = e.key;
          const newSlotNumber = Math.min(
            199,
            Math.max(0, Number(chars.join('')))
          );
          setFocusedDigit(
            focusedDigit ? /** @type {0 | 1} */ (focusedDigit - 1) : null
          );
          onSampleUpdate(sampleIdRef.current, { slotNumber: newSlotNumber });
        } else {
          onSampleUpdate(sampleIdRef.current, { slotNumber });
        }
      }
      /** @param {MouseEvent} e */
      function onDocumentClick(e) {
        if (
          slotNumberRef.current &&
          slotNumberRef.current.contains(/** @type {Node} */ (e.target))
        ) {
          return;
        }
        setFocusedDigit(null);
      }
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('keyup', onKeyUp, true);
      document.addEventListener('click', onDocumentClick);
      const slotNumberElement = /** @type {HTMLDivElement} */ (
        slotNumberRef.current
      );
      let pageYStart = 0;
      let mousedown = false;
      let slotNumberDragged = false;
      let slotNumberStart = 0;
      /**
       * @param {MouseEvent | TouchEvent} e
       */
      function handleMouseDown(e) {
        document.body.style.userSelect = 'none';
        pageYStart = e instanceof MouseEvent ? e.pageY : e.touches[0].pageY;
        mousedown = true;
        slotNumberDragged = false;
        slotNumberStart = slotNumberLocalRef.current;
      }
      slotNumberElement.addEventListener('mousedown', handleMouseDown);
      slotNumberElement.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleMouseDown(e);
      });
      /**
       * @param {MouseEvent | TouchEvent} e
       */
      function handleMouseMove(e) {
        if (!mousedown) {
          return;
        }
        const { pageY } = e instanceof MouseEvent ? e : e.touches[0];
        const pixelsPerIncrement = 2;
        const increment = Math.round((pageYStart - pageY) / pixelsPerIncrement);
        if (increment) {
          slotNumberDragged = true;
          setSlotNumberLocal(
            Math.min(199, Math.max(0, slotNumberStart + increment))
          );
        }
      }
      window.addEventListener('mousemove', handleMouseMove);
      slotNumberElement.addEventListener('touchmove', handleMouseMove);
      function handleMouseUp() {
        document.body.style.userSelect = 'unset';
        mousedown = false;
        if (slotNumberDragged) {
          onSampleUpdate(sampleIdRef.current, {
            slotNumber: slotNumberLocalRef.current,
          });
        }
      }
      window.addEventListener('mouseup', handleMouseUp);
      slotNumberElement.addEventListener('touchend', handleMouseUp);
      slotNumberElement.addEventListener('touchcancel', () => {
        document.body.style.userSelect = 'unset';
      });
      /** @param {MouseEvent} e */
      function handleClick(e) {
        if (
          slotNumberDragged ||
          (digitElementsRef.current &&
            digitElementsRef.current.some((elem) =>
              elem.contains(/** @type {Node} */ (e.target))
            ))
        ) {
          return;
        }
        setFocusedDigit(2);
      }
      slotNumberElement.addEventListener('click', handleClick);
      digitElementsRef.current.forEach((element, i) => {
        const digit = /** @type {0 | 1 | 2} */ (i);
        element.addEventListener('click', () => {
          if (!slotNumberDragged) {
            setFocusedDigit(digit);
          }
        });
        element.addEventListener('touchstart', (e) => {
          e.preventDefault();
        });
      });
      return () => {
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('keyup', onKeyUp, true);
        document.removeEventListener('click', onDocumentClick);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [onSampleUpdate]);
  }
  useEffect(() => {
    if (!digitElementsRef.current) {
      throw new Error('Expected elements to exist');
    }
    digitElementsRef.current.forEach((element, i) => {
      if (i === focusedDigit) {
        element.classList.add(classes.active);
      } else {
        element.classList.remove(classes.active);
      }
    });
  }, [focusedDigit]);
  return (
    <>
      <Form.Label>Destination</Form.Label>
      <br />
      <div className={classes.slotNumberRow}>
        <div className={classes.slotNumberContainer}>
          <div className={classes.arrowControls}>
            <span onClick={() => handleArrowUp(2)}>
              <img src={keyboardArrowUpIcon} alt="Increment 100" />
            </span>
            <span onClick={() => handleArrowUp(1)}>
              <img src={keyboardArrowUpIcon} alt="Increment 10" />
            </span>
            <span onClick={() => handleArrowUp(0)}>
              <img src={keyboardArrowUpIcon} alt="Increment 1" />
            </span>
          </div>
          <div
            className={classes.slotNumber}
            title={`Slot ${slotNumberLocal}`}
            ref={slotNumberRef}
          >
            {/* behind the real information we just put a row of faint 8s to
        simulate the effect of unilluminated character segments */}
            <SevenSegmentDisplay
              value="8888"
              color="var(--bs-gray-dark)"
              strokeColor="transparent"
              digitCount={4}
            />
            <SevenSegmentDisplay
              ref={
                /**
                 * @param {React.Component} instance
                 */
                (instance) => {
                  const svg = /** @type {SVGElement} */ (findDOMNode(instance));
                  if (svg) {
                    svg.querySelectorAll('circle').forEach((oldPoint) => {
                      svg.removeChild(oldPoint);
                    });
                    const point = document.createElementNS(
                      'http://www.w3.org/2000/svg',
                      'circle'
                    );
                    point.classList.add(classes.point);
                    point.setAttribute('cx', '10.7');
                    point.setAttribute('cy', '17');
                    point.setAttribute('r', '1');
                    svg.appendChild(point);

                    digitElementsRef.current = /** @type {SVGGElement[]} */ (
                      [].slice.call(svg.querySelectorAll('g'))
                    )
                      // call .reverse() to get the right-most (smallest) digit first
                      .reverse()
                      .slice(0, 3);
                  }
                }
              }
              // the 5 actually represents an S
              value={`5${String(slotNumberLocal).padStart(3, '0')}`}
              digitProps={{ color: 'var(--bs-primary)' }}
              digitCount={4}
            />
          </div>
          <div className={classes.arrowControls}>
            <span onClick={() => handleArrowDown(2)}>
              <img src={keyboardArrowDownIcon} alt="Decrement 100" />
            </span>
            <span onClick={() => handleArrowDown(1)}>
              <img src={keyboardArrowDownIcon} alt="Decrement 10" />
            </span>
            <span onClick={() => handleArrowDown(0)}>
              <img src={keyboardArrowDownIcon} alt="Decrement 1" />
            </span>
          </div>
        </div>
        {sample.metadata.slotNumber > 99 && slotNumberLocal > 99 && (
          <OverlayTrigger
            placement="auto-end"
            overlay={
              <Tooltip>
                To transfer to this destination, be sure you have a volca
                sample2. The original volca sample only supports slots 0-99.
              </Tooltip>
            }
          >
            <img
              className={classes.warning}
              src={warningIcon}
              alt="destination-warning"
            />
          </OverlayTrigger>
        )}
      </div>
    </>
  );
}

export default SlotNumberInput;

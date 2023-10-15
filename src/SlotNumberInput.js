import React, { useCallback, useEffect, useRef, useState } from 'react';
import SevenSegmentDisplay, { Digit } from 'seven-segment-display';
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { findDOMNode as _findDOMNode } from 'react-dom';
import { ReactComponent as KeyboardArrowUpIcon } from '@material-design-icons/svg/filled/keyboard_arrow_up.svg';
import { ReactComponent as KeyboardArrowDownIcon } from '@material-design-icons/svg/filled/keyboard_arrow_down.svg';
import { ReactComponent as WarningIcon } from '@material-design-icons/svg/filled/warning.svg';

import classes from './SlotNumberInput.module.scss';

/** @type {typeof _findDOMNode} */
function findDOMNodeSuppressError(component) {
  const { error } = console;
  console.error = () => null;
  const node = _findDOMNode(component);
  console.error = error;
  return node;
}

// get rid of pointless error message in local dev
const findDOMNode =
  process.env.NODE_ENV === 'development'
    ? findDOMNodeSuppressError
    : _findDOMNode;

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

const SlotNumberInput = React.memo(
  /**
   * @param {{
   *   slotNumber: number;
   *   onSlotNumberUpdate: (update: number | ((slotNumber: number) => number)) => void;
   * }} props
   */
  function ({ slotNumber, onSlotNumberUpdate }) {
    const [slotNumberLocal, setSlotNumberLocal] = useState(slotNumber);
    useEffect(() => {
      setSlotNumberLocal(slotNumber);
    }, [slotNumber]);

    // 0 is 0-9, 1 is 0-90, 2 is 0-200
    const [focusedDigit, setFocusedDigit] = useState(
      /** @type {0 | 1 | 2 | null} */ (null)
    );

    /** @type {(digit: 0 | 1 | 2) => void} */
    const handleArrowUp = useCallback(
      (digit) => {
        onSlotNumberUpdate((slotNumber) => arrowUpCallback(digit, slotNumber));
      },
      [onSlotNumberUpdate]
    );

    /** @type {(digit: 0 | 1 | 2) => void} */
    const handleArrowDown = useCallback(
      (digit) => {
        onSlotNumberUpdate((slotNumber) =>
          arrowDownCallback(digit, slotNumber)
        );
      },
      [onSlotNumberUpdate]
    );

    /**
     * @type {React.RefObject<HTMLDivElement>}
     */
    const slotNumberRef = useRef(null);
    const digitElementsRef = useRef(/** @type {SVGGElement[] | null} */ (null));
    {
      const focusedDigitRef = useRef(focusedDigit);
      focusedDigitRef.current = focusedDigit;
      const slotNumberLocalRef = useRef(slotNumberLocal);
      slotNumberLocalRef.current = slotNumberLocal;
      const onSlotNumberUpdateRef = useRef(onSlotNumberUpdate);
      onSlotNumberUpdateRef.current = onSlotNumberUpdate;
      useEffect(() => {
        if (!digitElementsRef.current) {
          throw new Error('Expected elements to exist');
        }
        /** @param {KeyboardEvent} e */
        function onKeyDown(e) {
          const focusedDigit =
            focusedDigitRef.current === null ? 0 : focusedDigitRef.current;
          let handled = true;
          const beforeArrowAction = () => {
            setFocusedDigit(focusedDigit);
          };
          switch (e.key) {
            // slot number down
            case 'ArrowDown':
              beforeArrowAction();
              setSlotNumberLocal((slotNumber) =>
                arrowDownCallback(focusedDigit, slotNumber)
              );
              break;
            // slot number up
            case 'ArrowUp':
              beforeArrowAction();
              setSlotNumberLocal((slotNumber) =>
                arrowUpCallback(focusedDigit, slotNumber)
              );
              break;
            // digit navigation left
            case 'ArrowLeft':
              beforeArrowAction();
              setFocusedDigit((digit) =>
                digit !== null && digit < 2
                  ? /** @type {1 | 2} */ (digit + 1)
                  : digit
              );
              break;
            // digit navigation right
            case 'ArrowRight':
              beforeArrowAction();
              setFocusedDigit((digit) =>
                digit ? /** @type {0 | 1} */ (digit - 1) : digit
              );
              break;
            case 'Enter':
            case 'Escape':
              setFocusedDigit(null);
              break;
            default:
              handled = false;
              break;
          }
          if (handled) {
            e.preventDefault();
          }
        }
        /** @param {KeyboardEvent} e */
        function onKeyUp(e) {
          const focusedDigit =
            focusedDigitRef.current === null ? 2 : focusedDigitRef.current;
          e.stopPropagation();
          e.preventDefault();
          const slotNumber = slotNumberLocalRef.current;
          const onSlotNumberUpdate = onSlotNumberUpdateRef.current;
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
            onSlotNumberUpdate(newSlotNumber);
          } else {
            onSlotNumberUpdate(slotNumber);
          }
        }
        const slotNumberElement = /** @type {HTMLDivElement} */ (
          slotNumberRef.current
        );
        slotNumberElement.addEventListener('keydown', onKeyDown, true);
        slotNumberElement.addEventListener('keyup', onKeyUp, true);
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
          const increment = Math.round(
            (pageYStart - pageY) / pixelsPerIncrement
          );
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
            const onSlotNumberUpdate = onSlotNumberUpdateRef.current;
            onSlotNumberUpdate(slotNumberLocalRef.current);
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
        function handleFocus() {
          if (mousedown) {
            // we already handle this for mouse events
            return;
          }
          setFocusedDigit(2);
        }
        function handleBlur() {
          setFocusedDigit(null);
        }
        slotNumberElement.addEventListener('focus', handleFocus);
        slotNumberElement.addEventListener('blur', handleBlur);
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
      }, []);
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
        <Form.Label>Choose destination</Form.Label>
        <br />
        <div className={classes.slotNumberRow}>
          <div className={classes.slotNumberContainer}>
            <div className={classes.arrowControls}>
              <span onClick={() => handleArrowUp(2)}>
                <KeyboardArrowUpIcon />
              </span>
              <span onClick={() => handleArrowUp(1)}>
                <KeyboardArrowUpIcon />
              </span>
              <span onClick={() => handleArrowUp(0)}>
                <KeyboardArrowUpIcon />
              </span>
            </div>
            <OverlayTrigger
              delay={{ show: 400, hide: 0 }}
              placement="right"
              overlay={<Tooltip>Slot {slotNumberLocal}</Tooltip>}
            >
              <div
                className={classes.slotNumber}
                ref={slotNumberRef}
                tabIndex={0}
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
                     * @param {Parameters<typeof findDOMNode>[0]} instance
                     */
                    (instance) => {
                      const svg = /** @type {SVGElement} */ (
                        findDOMNode(instance)
                      );
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

                        digitElementsRef.current =
                          /** @type {SVGGElement[]} */ (
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
            </OverlayTrigger>
            <div className={classes.arrowControls}>
              <span onClick={() => handleArrowDown(2)}>
                <KeyboardArrowDownIcon />
              </span>
              <span onClick={() => handleArrowDown(1)}>
                <KeyboardArrowDownIcon />
              </span>
              <span onClick={() => handleArrowDown(0)}>
                <KeyboardArrowDownIcon />
              </span>
            </div>
          </div>
          {slotNumber > 99 && slotNumberLocal > 99 && (
            <OverlayTrigger
              placement="auto-end"
              overlay={
                <Tooltip>
                  To transfer to this destination, be sure you have a volca
                  sample2. The original volca sample only supports slots 0-99.
                </Tooltip>
              }
            >
              <span className={classes.warning}>
                <WarningIcon />
              </span>
            </OverlayTrigger>
          )}
        </div>
      </>
    );
  }
);

export default SlotNumberInput;

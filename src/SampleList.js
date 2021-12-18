import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Form } from 'react-bootstrap';
import { styled } from 'tonami';

import { WAVEFORM_CACHED_WIDTH } from './utils/waveform.js';
import WaveformDisplay from './WaveformDisplay.js';

import classes from './SampleList.module.scss';

const WaveformContainer = styled.div({
  width: `${WAVEFORM_CACHED_WIDTH}px`,
  height: '40px',
});

const intersectionObserverAvailable =
  typeof IntersectionObserver !== 'undefined';

const SampleListItem = React.memo(
  /**
   * @param {{
   *   sample: import('./store').SampleContainer;
   *   selected: boolean;
   *   onSampleSelect: (id: string) => void;
   * }} props
   */
  function SampleListItem({ sample, selected, onSampleSelect }) {
    /**
     * @type {React.RefObject<HTMLDivElement>}
     */
    const waveformContainerRef = useRef(null);
    const [waveformSeen, setWaveformSeen] = useState(
      !intersectionObserverAvailable
    );
    useLayoutEffect(() => {
      if (!intersectionObserverAvailable) {
        return;
      }
      const waveformContainer = waveformContainerRef.current;
      if (!waveformContainer) {
        throw new Error('Waveform container should be defined');
      }
      // check if waveform is visible now.. if so, render immediately
      const rect = waveformContainer.getBoundingClientRect();
      if (
        rect.top + rect.height >= 0 &&
        rect.bottom - rect.height <= window.innerHeight
      ) {
        setWaveformSeen(true);
        return;
      }
      // otherwise set up an observer for when the waveform does become visible
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setWaveformSeen(true);
          observer.unobserve(waveformContainer);
        }
      });
      observer.observe(waveformContainer);
      return () => observer.disconnect();
    }, []);
    /** @type {React.RefObject<HTMLButtonElement>} */
    const buttonRef = useRef(null);
    useEffect(() => {
      if (!selected || !buttonRef.current) {
        return;
      }
      const button = buttonRef.current;
      const accordionCollapse = /** @type {HTMLElement | null} */ (
        button.closest('.accordion-collapse')
      );
      if (!accordionCollapse) {
        return;
      }
      const isPartiallyOutOfView =
        accordionCollapse.scrollTop > button.offsetTop ||
        accordionCollapse.scrollTop + accordionCollapse.offsetHeight <
          button.offsetTop - button.offsetHeight;
      if (isPartiallyOutOfView) {
        button.scrollIntoView({ block: 'center' });
      }
    }, [selected]);
    return (
      <button
        className={[
          'list-group-item',
          classes.listItem,
          selected ? `active ${classes.active}` : '',
        ].join(' ')}
        tabIndex={-1}
        onClick={() => onSampleSelect(sample.id)}
        ref={buttonRef}
      >
        <Form.Label>{sample.metadata.name}</Form.Label>
        <div className={classes.listWaveform}>
          <WaveformContainer ref={waveformContainerRef}>
            {waveformSeen && (
              <WaveformDisplay peaks={sample.metadata.trim.waveformPeaks} />
            )}
          </WaveformContainer>
        </div>
      </button>
    );
  }
);

/**
 * @param {{
 *   samples: import('./store').SampleContainer[];
 *   selectedSampleId: string | null;
 *   onSampleSelect: (id: string) => void;
 * }} props
 */
function SampleList({ samples, selectedSampleId, onSampleSelect }) {
  /** @type {React.RefObject<HTMLUListElement>} */
  const listRef = useRef(null);
  /** @type {React.KeyboardEventHandler} */
  const handleKeyDown = useCallback(
    (e) => {
      if (!listRef.current) {
        return;
      }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        return;
      }
      const button = /** @type {HTMLElement} */ (e.target).closest('button');
      if (button) {
        e.preventDefault();
        const index = Array.prototype.indexOf.call(
          listRef.current.children,
          button
        );
        if (e.key === 'ArrowUp' && index > 0) {
          if (button.previousElementSibling instanceof HTMLButtonElement) {
            button.previousElementSibling.focus();
          }
        }
        if (e.key === 'ArrowDown' && index + 1 < samples.length) {
          if (button.nextElementSibling instanceof HTMLButtonElement) {
            button.nextElementSibling.focus();
          }
        }
      }
    },
    [samples]
  );
  /** @type {React.KeyboardEventHandler} */
  const handleKeyUp = useCallback(
    (e) => {
      if (
        !listRef.current ||
        !(document.activeElement instanceof HTMLButtonElement)
      ) {
        return;
      }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        return;
      }
      const index = Array.prototype.indexOf.call(
        listRef.current.children,
        document.activeElement
      );
      if (index === -1) {
        return;
      }
      e.preventDefault();
      const sampleToSelect = samples[index];
      if (sampleToSelect) {
        onSampleSelect(sampleToSelect.id);
      }
    },
    [samples, onSampleSelect]
  );
  return (
    <ul
      ref={listRef}
      className="list-group list-group-flush"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {samples.length ? (
        samples.map((sample) => (
          <SampleListItem
            key={sample.id}
            sample={sample}
            selected={sample.id === selectedSampleId}
            onSampleSelect={onSampleSelect}
          />
        ))
      ) : (
        <li className="list-group-item">
          <Form.Label className={classes.emptyListMessage}>
            No samples found.
          </Form.Label>
        </li>
      )}
    </ul>
  );
}

export default SampleList;

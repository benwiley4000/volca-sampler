import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button, Form } from 'react-bootstrap';
import PlayIcon from '@material-design-icons/svg/filled/play_arrow.svg';
import StopIcon from '@material-design-icons/svg/filled/stop.svg';

import {
  useWaveformPlayback,
  WAVEFORM_CACHED_WIDTH,
} from './utils/waveform.js';
import WaveformDisplay from './WaveformDisplay.js';
import WaveformListItemPlayback from './WaveformListItemPlayback.js';
import { usePreviewAudio } from './sampleCacheStore.js';

import classes from './SampleList.module.scss';

const intersectionObserverAvailable =
  typeof IntersectionObserver !== 'undefined';

const SampleListItem = React.memo(
  /**
   * @param {{
   *   sample: import('./store').SampleContainer;
   *   sampleCache: import('./sampleCacheStore.js').SampleCache | null;
   *   selected: boolean;
   *   onSampleSelectClick: (id: string, e: React.MouseEvent) => void;
   * }} props
   */
  function SampleListItem({
    sample,
    sampleCache,
    selected,
    onSampleSelectClick,
  }) {
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

    const [audioRequested, setAudioRequested] = useState(false);

    const { audioBuffer } = usePreviewAudio(sampleCache, audioRequested);

    const {
      isPlaybackActive,
      playbackProgress,
      togglePlayback: _togglePlayback,
    } = useWaveformPlayback(audioBuffer || null);

    const togglePlayback = useCallback(
      /** @param {MouseEvent | KeyboardEvent} e */
      (e) => {
        _togglePlayback(e);
        setAudioRequested(true);
      },
      [_togglePlayback]
    );

    return (
      <div
        className={[
          'list-group-item',
          classes.listItem,
          selected ? `active ${classes.active}` : '',
        ].join(' ')}
        tabIndex={-1}
        onClick={(e) => {
          const playButton = e.currentTarget.querySelector('button');
          if (
            playButton &&
            playButton.contains(/** @type {Node} */ (e.target))
          ) {
            // ignore play button which should't change sample selection
            return;
          }
          onSampleSelectClick(sample.id, e);
        }}
      >
        <span className={classes.sampleTitle}>
          <div className={classes.multiSelector}>
            <input readOnly type="radio" checked={selected} />
          </div>
          <Button
            className={classes.playbackButton}
            tabIndex={-1}
            variant="dark"
            onClick={(e) => {
              togglePlayback(e.nativeEvent);
            }}
          >
            {isPlaybackActive ? <StopIcon /> : <PlayIcon />}
          </Button>
          <span className={classes.name}>{sample.metadata.name}</span>
          <span className={classes.slot}>
            S.{sample.metadata.slotNumber.toString().padStart(3, '0')}
          </span>
        </span>
        <div
          className={[
            classes.waveformContainer,
            isPlaybackActive ? classes.playbackActive : '',
          ].join(' ')}
          style={{
            // @ts-ignore
            '--waveform-width': `${WAVEFORM_CACHED_WIDTH}px`,
          }}
          ref={waveformContainerRef}
        >
          {waveformSeen && sampleCache && (
            <>
              <WaveformDisplay
                peaks={sampleCache.cachedInfo.waveformPeaks}
                scaleCoefficient={1}
              />
              <WaveformListItemPlayback
                isPlaybackActive={isPlaybackActive}
                playbackProgress={playbackProgress}
              />
            </>
          )}
        </div>
      </div>
    );
  }
);

/**
 * @param {{
 *   samples: import('./store').SampleContainer[];
 *   sampleCaches: Map<string, import('./sampleCacheStore.js').SampleCache>;
 *   selectedSampleId: string | null;
 *   multipleSelection: Set<string> | null;
 *   onSampleSelect: (...ids: string[]) => void;
 * }} props
 */
function SampleList({
  samples,
  sampleCaches,
  selectedSampleId,
  multipleSelection,
  onSampleSelect,
}) {
  /** @type {React.RefObject<HTMLUListElement>} */
  const listRef = useRef(null);

  const samplesRef = useRef(samples);
  samplesRef.current = samples;

  const scrollSampleIntoView = useCallback(
    /** @param {string} sampleId */
    (sampleId) => {
      const index = samplesRef.current.findIndex((s) => s.id === sampleId);
      const list = listRef.current;
      if (!list || index === -1) return;
      const listItem = /** @type {HTMLElement} */ (list.children[index]);
      const accordionCollapse = /** @type {HTMLElement | null} */ (
        listItem.closest('.accordion-collapse')
      );
      if (!accordionCollapse) {
        return;
      }
      const isPartiallyOutOfView =
        accordionCollapse.offsetTop + accordionCollapse.scrollTop >
          listItem.offsetTop ||
        accordionCollapse.scrollTop + accordionCollapse.offsetHeight <
          listItem.offsetTop - listItem.offsetHeight;
      if (isPartiallyOutOfView) {
        listItem.scrollIntoView({ block: 'nearest' });
      }
    },
    []
  );

  useEffect(() => {
    if (selectedSampleId) scrollSampleIntoView(selectedSampleId);
  }, [selectedSampleId, scrollSampleIntoView]);

  const onSampleSelectRef = useRef(onSampleSelect);
  onSampleSelectRef.current = onSampleSelect;
  const multipleSelectionRef = useRef(multipleSelection);
  multipleSelectionRef.current = multipleSelection;

  const lastSampleIdClickedWithoutShiftRef = useRef(
    /** @type {string | null} */ (null)
  );
  const lastSampleIdSelectedWithShiftRef = useRef(
    /** @type {string | null} */ (null)
  );

  // clear refs to shift-selected samples when we update the sample list
  useEffect(() => {
    lastSampleIdClickedWithoutShiftRef.current = null;
    lastSampleIdSelectedWithShiftRef.current = null;
  }, [samples.length]);

  // clear refs to shift-selected samples when they are no longer selected
  useEffect(() => {
    if (
      lastSampleIdClickedWithoutShiftRef.current &&
      (!multipleSelection ||
        !multipleSelection.has(lastSampleIdClickedWithoutShiftRef.current))
    ) {
      lastSampleIdClickedWithoutShiftRef.current = null;
    }
    if (
      lastSampleIdSelectedWithShiftRef.current &&
      (!multipleSelection ||
        !multipleSelection.has(lastSampleIdSelectedWithShiftRef.current))
    ) {
      lastSampleIdSelectedWithShiftRef.current = null;
    }
  }, [multipleSelection]);

  const handleShiftMultiSelect = useCallback(
    /**
     * @param {string} sampleId
     * @param {React.MouseEvent | React.KeyboardEvent} e
     * @return {boolean}
     */
    (sampleId, e) => {
      const sampleIds = samplesRef.current.map((s) => s.id);
      const multipleSelection = multipleSelectionRef.current;
      let firstSampleIndex = -1;
      if (
        e.shiftKey &&
        lastSampleIdClickedWithoutShiftRef.current &&
        (!multipleSelection ||
          multipleSelection.has(lastSampleIdClickedWithoutShiftRef.current)) &&
        (firstSampleIndex = sampleIds.indexOf(
          lastSampleIdClickedWithoutShiftRef.current
        )) !== -1
      ) {
        const lastSampleIndex = sampleIds.indexOf(sampleId);
        const sampleIdsToSelect = sampleIds.slice(
          Math.min(firstSampleIndex, lastSampleIndex),
          Math.max(firstSampleIndex, lastSampleIndex) + 1
        );
        const previousLastSampleIndex = lastSampleIdSelectedWithShiftRef.current
          ? sampleIds.indexOf(lastSampleIdSelectedWithShiftRef.current)
          : -1;
        /** @type {string[]} */
        let sampleIdsToUnselect = [];
        if (previousLastSampleIndex !== -1) {
          sampleIdsToUnselect = sampleIds
            .slice(
              Math.min(previousLastSampleIndex, lastSampleIndex),
              Math.max(previousLastSampleIndex, lastSampleIndex) + 1
            )
            .filter((id) => !sampleIdsToSelect.includes(id));
        }
        onSampleSelectRef.current(
          ...sampleIdsToSelect.filter(
            (id) => !multipleSelection || !multipleSelection.has(id)
          ),
          ...sampleIdsToUnselect.filter(
            (id) => multipleSelection && multipleSelection.has(id)
          )
        );
        lastSampleIdSelectedWithShiftRef.current = sampleId;
        scrollSampleIntoView(sampleId);
        return true;
      }
      return false;
    },
    [scrollSampleIntoView]
  );

  /** @type {React.KeyboardEventHandler} */
  const handleKeyDown = useCallback((e) => {
    if (!listRef.current) {
      return;
    }
    if (
      e.key !== 'ArrowUp' &&
      e.key !== 'ArrowDown' &&
      !(multipleSelectionRef.current && e.key === ' ')
    ) {
      return;
    }
    const listItem = /** @type {HTMLElement} */ (e.target).closest(
      `.${classes.listItem}`
    );
    if (listItem) {
      e.preventDefault();
      if (e.key === ' ') {
        e.stopPropagation();
        const playButton = listItem.querySelector(`.${classes.playbackButton}`);
        if (playButton) {
          playButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      } else {
        const index = Array.prototype.indexOf.call(
          listRef.current.children,
          listItem
        );
        if (e.key === 'ArrowUp' && index > 0) {
          if (listItem.previousElementSibling instanceof HTMLDivElement) {
            listItem.previousElementSibling.focus();
          }
        }
        if (e.key === 'ArrowDown' && index + 1 < samplesRef.current.length) {
          if (listItem.nextElementSibling instanceof HTMLDivElement) {
            listItem.nextElementSibling.focus();
          }
        }
      }
    }
  }, []);
  /** @type {React.KeyboardEventHandler} */
  const handleKeyUp = useCallback(
    (e) => {
      if (
        !listRef.current ||
        !(document.activeElement instanceof HTMLDivElement)
      ) {
        return;
      }
      if (
        multipleSelectionRef.current && !e.shiftKey
          ? e.key !== 'Enter'
          : e.key !== 'ArrowUp' && e.key !== 'ArrowDown'
      ) {
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
      const sampleToSelect = samplesRef.current[index];
      if (sampleToSelect) {
        if (multipleSelectionRef.current && e.shiftKey) {
          handleShiftMultiSelect(sampleToSelect.id, e) ||
            onSampleSelectRef.current(sampleToSelect.id);
        } else {
          onSampleSelectRef.current(sampleToSelect.id);
        }
        scrollSampleIntoView(sampleToSelect.id);
      }
    },
    [handleShiftMultiSelect, scrollSampleIntoView]
  );

  // support shift+click
  const handleSampleSelectClick = useCallback(
    /**
     * @param {string} sampleId
     * @param {React.MouseEvent} e
     */
    (sampleId, e) => {
      if (!handleShiftMultiSelect(sampleId, e)) {
        onSampleSelectRef.current(sampleId);
        lastSampleIdClickedWithoutShiftRef.current = sampleId;
        lastSampleIdSelectedWithShiftRef.current = null;
        scrollSampleIntoView(sampleId);
      }
    },
    [handleShiftMultiSelect, scrollSampleIntoView]
  );

  return (
    <ul
      ref={listRef}
      className={[
        'list-group list-group-flush',
        multipleSelection ? classes.multiSelect : '',
        classes.noSelect,
      ].join(' ')}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {samples.length ? (
        samples.map((sample) => (
          <SampleListItem
            key={sample.id}
            sample={sample}
            sampleCache={sampleCaches.get(sample.id) || null}
            selected={
              multipleSelection
                ? multipleSelection.has(sample.id)
                : sample.id === selectedSampleId
            }
            onSampleSelectClick={handleSampleSelectClick}
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

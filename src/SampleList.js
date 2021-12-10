import React, { useLayoutEffect, useRef, useState } from 'react';
import { styled } from 'tonami';
import { WAVEFORM_CACHED_WIDTH } from './utils/waveform';
import WaveformDisplay from './WaveformDisplay';

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
    return (
      <li
        className={['list-group-item', selected ? 'active' : ''].join(' ')}
        onClick={() => onSampleSelect(sample.id)}
      >
        <div>{sample.metadata.name}</div>
        <WaveformContainer ref={waveformContainerRef}>
          {waveformSeen && (
            <WaveformDisplay peaks={sample.metadata.trim.waveformPeaks} />
          )}
        </WaveformContainer>
      </li>
    );
  }
);

/**
 * @param {{
 *   samples: Map<string, import('./store').SampleContainer>;
 *   selectedSampleId: string | null;
 *   onSampleSelect: (id: string) => void;
 * }} props
 */
function SampleList({ samples, selectedSampleId, onSampleSelect }) {
  const elementsMap = useRef(
    /** @type {WeakMap<import('./store').SampleContainer, React.ReactElement>} */ (
      new WeakMap()
    )
  );
  /** @type {React.ReactElement[]} */
  const elementsList = [];
  for (const sample of samples.values()) {
    let element = elementsMap.current.get(sample);
    if (!element) {
      element = (
        <SampleListItem
          key={sample.id}
          sample={sample}
          selected={sample.id === selectedSampleId}
          onSampleSelect={onSampleSelect}
        />
      );
      elementsMap.current.set(sample, element);
    }
    elementsList.push(element);
  }
  return <ul className="list-group list-group-flush">{elementsList}</ul>;
}

export default SampleList;

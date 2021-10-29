import React, { useLayoutEffect, useRef, useState } from 'react';
import { ListGroup } from 'react-bootstrap';
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
  ({ sample, selected, onSampleSelect }) => {
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
      <ListGroup.Item
        active={selected}
        onClick={() => onSampleSelect(sample.id)}
      >
        <div>{sample.metadata.name}</div>
        <WaveformContainer ref={waveformContainerRef}>
          {waveformSeen && (
            <WaveformDisplay
              peaks={sample.metadata.trim.waveformPeaks}
              scaleCoefficient={sample.metadata.scaleCoefficient}
            />
          )}
        </WaveformContainer>
      </ListGroup.Item>
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
function SampleList({
  samples,
  selectedSampleId,
  onSampleSelect,
}) {
  return (
    <ListGroup variant="flush">
      {[...samples].map(([id, sample]) => (
        <SampleListItem
          key={id}
          sample={sample}
          selected={id === selectedSampleId}
          onSampleSelect={onSampleSelect}
        />
      ))}
    </ListGroup>
  );
}

export default SampleList;

import React from 'react';
import { styled } from 'tonami';
import { WAVEFORM_CACHED_WIDTH } from './utils/waveform';
import WaveformDisplay from './WaveformDisplay';

const SampleListContainer = styled.div({
  height: '100%',
  overflow: 'auto',
});

const SampleListItem = styled.div({
  padding: '0.5rem',
  border: '1px solid grey',
  cursor: 'pointer',
  backgroundColor: ({ $selected }) => ($selected ? '#f3f3f3' : 'unset'),
});

const WaveformContainer = styled.div({
  width: `${WAVEFORM_CACHED_WIDTH}px`,
  height: '40px',
});

/**
 * @param {{
 *   samples: Map<string, import('./store').SampleContainer>;
 *   selectedSampleId: string | null;
 *   readonly: boolean;
 *   onNewSample: () => void;
 *   onSampleSelect: (id: string) => void;
 * }} props
 */
function SampleList({
  samples,
  selectedSampleId,
  readonly,
  onNewSample,
  onSampleSelect,
}) {
  return (
    <SampleListContainer>
      <SampleListItem
        data-disabled={readonly}
        onClick={() => !readonly && onNewSample()}
      >
        New Sample
      </SampleListItem>
      {[...samples].map(([id, sample]) => (
        <SampleListItem
          key={id}
          $selected={id === selectedSampleId}
          data-disabled={readonly}
          onClick={() => !readonly && onSampleSelect(id)}
        >
          <div>{sample.metadata.name}</div>
          <WaveformContainer>
            <WaveformDisplay
              peaks={sample.metadata.trim.waveformPeaks}
              scaleCoefficient={sample.metadata.scaleCoefficient}
            />
          </WaveformContainer>
        </SampleListItem>
      ))}
    </SampleListContainer>
  );
}

export default SampleList;

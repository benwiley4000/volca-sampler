import React from 'react';
import { styled } from 'tonami';

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
          <div>
            Updated {new Date(sample.metadata.dateModified).toLocaleString()}
          </div>
        </SampleListItem>
      ))}
    </SampleListContainer>
  );
}

export default SampleList;

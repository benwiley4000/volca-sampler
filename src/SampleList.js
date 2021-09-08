import React from 'react';

import { SampleContainer } from './store';

{
  const css = `
.sampleList {
  height: 100%;
  overflow: auto;
}

.sampleListItem {
  padding: 0.5rem;
  border: 1px solid grey;
  cursor: pointer;
}

.sampleListItem:not:nth-child(1) {
  margin-top: 1rem;
}
  `;
  const style = document.createElement('style');
  style.innerHTML = css;
  document.body.appendChild(style);
}
/**
 * @type {Record<string, string>}
 */
const classes = ['sampleList', 'sampleListItem'].reduce(
  (classes, className) => ({ ...classes, [className]: className }),
  {}
);

/**
 * @param {{
 *   samples: Map<string, SampleContainer>;
 *   selectedSampleId: string | null;
 *   readonly: boolean;
 *   onNewSample: () => void;
 *   onSampleSelect: (id: string) => void;
 * }} props
 */
function SampleList({ samples, selectedSampleId, readonly, onNewSample, onSampleSelect }) {
  return (
    <div className={classes.sampleList}>
      <div
        data-disabled={readonly}
        className={classes.sampleListItem}
        onClick={() => !readonly && onNewSample()}
      >
        New Sample
      </div>
      {[...samples].map(([id, sample]) => (
        <div
          key={id}
          className={classes.sampleListItem}
          style={{ backgroundColor: id === selectedSampleId ? '#f3f3f3' : undefined }}
          data-disabled={readonly}
          onClick={() => !readonly && onSampleSelect(id)}
        >
          <div>{sample.metadata.name}</div>
          <div>
            Updated {new Date(sample.metadata.dateModified).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SampleList;

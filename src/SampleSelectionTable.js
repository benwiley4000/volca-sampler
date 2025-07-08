import React, { useMemo, useRef } from 'react';
import { Table } from 'react-bootstrap';

import { SampleContainer } from './store.js';
import ToyBrick from './icons/toy-brick.svg';

import classes from './SampleSelectionTable.module.scss';

/** @typedef {import('./store.js').SampleMetadataExport} SampleMetadataExport */

const SampleSelectionTable = React.memo(
  /**
   * @param {{
   *   samples: Map<string, SampleContainer | SampleMetadataExport>;
   *   selectedSampleIds: Set<string>;
   *   setSelectedSampleIds:
   *     (updater: (prevIds: Set<string>) => Set<string>) => void;
   *   sampleIdsWithPluginFails?: string[];
   *   highlightDuplicateSlots?: boolean;
   * }} props
   */
  function SampleSelectionTable({
    samples,
    selectedSampleIds,
    setSelectedSampleIds,
    sampleIdsWithPluginFails,
    highlightDuplicateSlots,
  }) {
    const allChecked = [...samples.keys()].every((id) =>
      selectedSampleIds.has(id)
    );
    const noneChecked =
      !allChecked &&
      [...samples.keys()].every((id) => !selectedSampleIds.has(id));
    const indeterminate = !allChecked && !noneChecked;
    /** @type {React.RefObject<HTMLInputElement>} */
    const checkboxRef = useRef(null);
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
    const duplicateSlots = useMemo(() => {
      if (!highlightDuplicateSlots)
        return /** @type {Set<number>} */ (new Set());
      /** @type {Map<number, number>}  */
      const slotCounts = new Map();
      for (const [id, sample] of samples) {
        if (!selectedSampleIds.has(id)) continue;
        const { slotNumber } =
          sample instanceof SampleContainer ? sample.metadata : sample;
        slotCounts.set(slotNumber, (slotCounts.get(slotNumber) || 0) + 1);
      }
      return new Set(
        [...slotCounts]
          .filter(([_, count]) => count > 1)
          .map(([slotNumber]) => slotNumber)
      );
    }, [samples, selectedSampleIds, highlightDuplicateSlots]);
    return (
      <Table className={classes.samplesTable}>
        <thead>
          <tr>
            <th className={classes.check}>
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={!noneChecked}
                onChange={(e) => {
                  setSelectedSampleIds((ids) => {
                    const newIds = new Set(ids);
                    if (e.target.checked) {
                      for (const [id] of samples) {
                        newIds.add(id);
                      }
                    } else {
                      for (const [id] of samples) {
                        newIds.delete(id);
                      }
                    }
                    return newIds;
                  });
                }}
              />
            </th>
            <th className={classes.name}>Name</th>
            <th className={classes.slotNumber}>Slot</th>
            <th className={classes.updated}>Updated</th>
            {sampleIdsWithPluginFails && (
              <th className={classes.pluginsOk} title="Plugin status">
                <ToyBrick />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {[...samples].map(([id, s]) => {
            const metadata = s instanceof SampleContainer ? s.metadata : s;
            return (
              <tr
                key={id}
                onClick={(e) => {
                  const input = /** @type {HTMLElement} */ (
                    e.currentTarget
                  ).querySelector('input');
                  if (
                    input &&
                    input !== e.target &&
                    !input.contains(/** @type {Node} */ (e.target))
                  )
                    input.click();
                }}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedSampleIds.has(id)}
                    onChange={(e) => {
                      setSelectedSampleIds((idsToImport) => {
                        const newIdsToImport = new Set(idsToImport);
                        if (e.target.checked) {
                          newIdsToImport.add(id);
                        } else {
                          newIdsToImport.delete(id);
                        }
                        return newIdsToImport;
                      });
                    }}
                  />
                </td>
                <td title={metadata.name}>{metadata.name}</td>
                <td
                  className={
                    duplicateSlots.has(metadata.slotNumber) &&
                    selectedSampleIds.has(id)
                      ? classes.duplicateSlot
                      : undefined
                  }
                >
                  {metadata.slotNumber}
                </td>
                <td title={new Date(metadata.dateModified).toLocaleString()}>
                  {new Date(metadata.dateModified).toLocaleDateString()}
                </td>
                {sampleIdsWithPluginFails && (
                  <td>
                    {sampleIdsWithPluginFails.includes(id)
                      ? '❌'
                      : s instanceof SampleContainer &&
                        s.metadata.plugins.length
                      ? 'OK'
                      : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }
);

export default SampleSelectionTable;

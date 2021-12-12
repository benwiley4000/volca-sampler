import React, { useCallback } from 'react';
import { Container, Dropdown, DropdownButton } from 'react-bootstrap';

import WaveformEdit from './WaveformEdit.js';
import VolcaTransferControl from './VolcaTransferControl.js';
import { SampleContainer } from './store.js';
import QualityBitDepthControl from './QualityBitDepthControl.js';
import NormalizeSwitch from './NormalizeSwitch.js';
import SlotNumberInput from './SlotNumberInput.js';
import { downloadBlob } from './utils/download.js';

import classes from './SampleDetail.module.scss';

const SampleDetail = React.memo(
  /**
   * @param {{
   *   sample: import('./store').SampleContainer;
   *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
   *   onSampleDuplicate: (id: string) => void;
   *   onSampleDelete: (id: string) => void;
   * }} props
   */
  function SampleDetail({
    sample,
    onSampleUpdate,
    onSampleDuplicate,
    onSampleDelete,
  }) {
    const sampleId = sample && sample.id;
    /**
     * @type {(updateTrimFrames: (old: [number, number]) => [number, number]) => void}
     */
    const handleSetTrimFrames = useCallback(
      (updateTrimFrames) =>
        sampleId &&
        onSampleUpdate(sampleId, (metadata) => ({
          ...metadata,
          trim: {
            ...metadata.trim,
            frames: updateTrimFrames(metadata.trim.frames),
          },
        })),
      [sampleId, onSampleUpdate]
    );
    /**
     * @type {(update: number | ((slotNumber: number) => number)) => void}
     */
    const handleSlotNumberUpdate = useCallback(
      (update) => {
        onSampleUpdate(sample.id, ({ slotNumber }) => ({
          slotNumber:
            typeof update === 'function' ? update(slotNumber) : update,
        }));
      },
      [sample.id, onSampleUpdate]
    );
    return (
      <Container fluid="sm">
        <h2>
          {sample.metadata.name}
          <SampleDetailActions
            sampleId={sample.id}
            name={sample.metadata.name}
            sourceFileId={sample.metadata.sourceFileId}
            userFileInfo={sample.metadata.userFileInfo}
            onSampleUpdate={onSampleUpdate}
            onSampleDuplicate={onSampleDuplicate}
            onSampleDelete={onSampleDelete}
          />
        </h2>
        <p>
          <strong>Sampled:</strong>{' '}
          {new Date(sample.metadata.dateSampled).toLocaleString()}
          <br />
          <strong>Updated:</strong>{' '}
          {new Date(sample.metadata.dateModified).toLocaleString()}
        </p>
        <h4>Configure</h4>
        <QualityBitDepthControl
          sampleId={sample.id}
          qualityBitDepth={sample.metadata.qualityBitDepth}
          onSampleUpdate={onSampleUpdate}
        />
        <NormalizeSwitch
          sampleId={sample.id}
          normalize={sample.metadata.normalize}
          onSampleUpdate={onSampleUpdate}
        />
        <div className={classes.waveformEditBoundingBox}>
          <WaveformEdit onSetTrimFrames={handleSetTrimFrames} sample={sample} />
        </div>
        <h4>Transfer</h4>
        <SlotNumberInput
          slotNumber={sample.metadata.slotNumber}
          onSlotNumberUpdate={handleSlotNumberUpdate}
        />
        <VolcaTransferControl sample={sample} />
      </Container>
    );
  }
);

const SampleDetailActions = React.memo(
  /**
   * @param {{
   *   sampleId: string;
   *   name: string;
   *   sourceFileId: string;
   *   userFileInfo: { type: string; ext: string } | null;
   *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
   *   onSampleDuplicate: (id: string) => void;
   *   onSampleDelete: (id: string) => void;
   * }} props
   */
  ({
    sampleId,
    name,
    sourceFileId,
    userFileInfo,
    onSampleUpdate,
    onSampleDuplicate,
    onSampleDelete,
  }) => {
    const handleRename = useCallback(() => {
      const newName = prompt(
        `Choose a new name for the sample "${name}":`,
        name
      );
      const newNameTrimmed = newName && newName.trim();
      if (newNameTrimmed) {
        onSampleUpdate(sampleId, { name: newNameTrimmed });
      }
    }, [name, sampleId, onSampleUpdate]);
    const handleDuplicate = useCallback(
      () => onSampleDuplicate(sampleId),
      [sampleId, onSampleDuplicate]
    );
    const downloadSourceFile = useCallback(async () => {
      const data = await SampleContainer.getSourceFileData(sourceFileId);
      const blob = new Blob([data], {
        type: userFileInfo ? userFileInfo.type : 'audio/x-wav',
      });
      downloadBlob(blob, `${name}${userFileInfo ? userFileInfo.ext : '.wav'}`);
    }, [name, sourceFileId, userFileInfo]);
    const handleDelete = useCallback(() => {
      if (window.confirm(`Are you sure you want to delete ${name}?`)) {
        onSampleDelete(sampleId);
      }
    }, [name, sampleId, onSampleDelete]);
    return (
      <DropdownButton
        className={classes.optionsButton}
        variant="light"
        align="end"
        title="options"
      >
        <Dropdown.Item onClick={handleRename}>Rename</Dropdown.Item>
        <Dropdown.Item onClick={handleDuplicate}>Duplicate</Dropdown.Item>
        <Dropdown.Item onClick={downloadSourceFile}>
          Download source audio
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={handleDelete}>Delete</Dropdown.Item>
      </DropdownButton>
    );
  }
);

export default SampleDetail;

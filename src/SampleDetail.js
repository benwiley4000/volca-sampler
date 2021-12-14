import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Container,
  Dropdown,
  DropdownButton,
  Form,
  Button,
  Modal,
} from 'react-bootstrap';
import { ReactComponent as WarningIcon } from '@material-design-icons/svg/filled/warning.svg';

import WaveformEdit from './WaveformEdit.js';
import VolcaTransferControl from './VolcaTransferControl.js';
import { SampleContainer } from './store.js';
import QualityBitDepthControl from './QualityBitDepthControl.js';
import SlotNumberInput from './SlotNumberInput.js';
import { downloadBlob } from './utils/download.js';
import { formatDate } from './utils/date.js';

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
          {formatDate(new Date(sample.metadata.dateSampled))}
          <br />
          <strong>Updated:</strong>{' '}
          {formatDate(new Date(sample.metadata.dateModified))}
        </p>
        <h4>Configure</h4>
        <QualityBitDepthControl
          sampleId={sample.id}
          qualityBitDepth={sample.metadata.qualityBitDepth}
          onSampleUpdate={onSampleUpdate}
        />
        <WaveformEdit sample={sample} onSampleUpdate={onSampleUpdate} />
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
    const [deleting, setDeleting] = useState(false);
    /** @type {React.RefObject<HTMLInputElement>} */
    const renameInputRef = useRef(null);
    const [editedName, setEditedName] = useState(name);
    const [renaming, setRenaming] = useState(false);
    useEffect(() => {
      if (renaming) {
        setEditedName(name);
        if (renameInputRef.current) {
          renameInputRef.current.select();
        }
      }
    }, [renaming, name]);
    const newNameTrimmed = editedName.trim();
    /** @type {React.FormEventHandler} */
    const handleRename = useCallback(
      (e) => {
        e.preventDefault();
        if (newNameTrimmed) {
          onSampleUpdate(sampleId, { name: newNameTrimmed });
          setRenaming(false);
        }
      },
      [newNameTrimmed, sampleId, onSampleUpdate]
    );
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
    /** @type {React.FormEventHandler} */
    const handleDelete = useCallback(
      (e) => {
        e.preventDefault();
        onSampleDelete(sampleId);
        setDeleting(false);
      },
      [sampleId, onSampleDelete]
    );
    return (
      <>
        <DropdownButton
          className={classes.optionsButton}
          variant="light"
          align="end"
          title="options"
        >
          <Dropdown.Item onClick={() => setRenaming(true)}>
            Rename
          </Dropdown.Item>
          <Dropdown.Item onClick={handleDuplicate}>Duplicate</Dropdown.Item>
          <Dropdown.Item onClick={downloadSourceFile}>
            Download source audio
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={() => setDeleting(true)}>
            Delete
          </Dropdown.Item>
        </DropdownButton>
        <Modal show={renaming} aria-labelledby="rename-modal">
          <Form onSubmit={handleRename}>
            <Modal.Header>
              <Modal.Title id="rename-modal">Renaming sample</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>
                Choose a new name for the sample <strong>{name}</strong>:
              </p>
              <Form.Control
                ref={renameInputRef}
                defaultValue={name}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button
                type="button"
                variant="light"
                onClick={() => setRenaming(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!newNameTrimmed}
              >
                Rename
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
        <Modal show={deleting} aria-labelledby="delete-modal">
          <Form onSubmit={handleDelete}>
            <Modal.Header className={classes.deleteModalHeader}>
              <WarningIcon />
              <Modal.Title id="delete-modal">Deleting sample</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>
                Are you sure you want to delete <strong>{name}</strong>?
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                type="button"
                variant="light"
                onClick={() => setDeleting(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Delete
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </>
    );
  }
);

export default SampleDetail;

import React, { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Dropdown,
  DropdownButton,
  Button,
} from 'react-bootstrap';

import WaveformEdit from './WaveformEdit.js';
import VolcaTransferControl from './VolcaTransferControl.js';
import {
  getTargetWavForSample,
  getAudioBufferForAudioFileData,
} from './utils/audioData.js';
import { SampleContainer } from './store.js';
import QualityBitDepthControl from './QualityBitDepthControl.js';
import NormalizeSwitch from './NormalizeSwitch.js';
import SlotNumberInput from './SlotNumberInput.js';

import classes from './SampleDetail.module.scss';

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
    const [targetWav, setTargetWav] = useState(
      /** @type {Uint8Array | null} */ (null)
    );
    const [audioBufferForAudioFileData, setAudioBufferForAudioFileData] =
      useState(/** @type {AudioBuffer | null} */ (null));
    const [callbackOnAudioBuffer, setCallbackOnAudioBuffer] = useState(
      /** @type {{ fn: () => void } | null} */ (null)
    );
    useEffect(() => {
      if (
        audioBufferForAudioFileData instanceof AudioBuffer &&
        callbackOnAudioBuffer
      ) {
        setCallbackOnAudioBuffer(null);
        callbackOnAudioBuffer.fn();
      }
    }, [audioBufferForAudioFileData, callbackOnAudioBuffer]);
    useEffect(() => {
      setTargetWav(null);
      setCallbackOnAudioBuffer(null);
      let cancelled = false;
      getTargetWavForSample(sample).then(({ data }) => {
        if (!cancelled) {
          setTargetWav(data);
        }
      });
    }, [sample]);
    useEffect(() => {
      setAudioBufferForAudioFileData(null);
      if (targetWav) {
        let cancelled = false;
        getAudioBufferForAudioFileData(targetWav).then((audioBuffer) => {
          if (!cancelled) {
            setAudioBufferForAudioFileData(audioBuffer);
          }
        });
      }
    }, [targetWav]);
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
        <br />
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
        <div className={classes.waveformBoundingBox}>
          <WaveformEdit
            onSetTrimFrames={handleSetTrimFrames}
            sample={sample}
            previewWav={audioBufferForAudioFileData}
          />
        </div>
        {/* {' '}
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          if (targetWav) {
            const blob = new Blob([targetWav], {
              type: 'audio/x-wav',
            });
            downloadBlob(blob, `${sample.metadata.name}.wav`);
          }
        }}
        disabled={!targetWav}
      >
        Download preview audio
      </Button> */}{' '}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            const { sourceFileId, userFileInfo } = sample.metadata;
            const data = await SampleContainer.getSourceFileData(sourceFileId);
            const blob = new Blob([data], {
              type: userFileInfo ? userFileInfo.type : 'audio/x-wav',
            });
            downloadBlob(
              blob,
              `${sample.metadata.name}${
                userFileInfo ? userFileInfo.ext : '.wav'
              }`
            );
          }}
        >
          Download original file
        </Button>
        <br />
        <br />
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
   *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
   *   onSampleDuplicate: (id: string) => void;
   *   onSampleDelete: (id: string) => void;
   * }} props
   */
  ({ sampleId, name, onSampleUpdate, onSampleDuplicate, onSampleDelete }) => {
    return (
      <DropdownButton
        className={classes.optionsButton}
        variant="light"
        align="end"
        title="options"
      >
        <Dropdown.Item
          onClick={() => {
            const newName = prompt(
              `Choose a new name for the sample "${name}":`,
              name
            );
            const newNameTrimmed = newName && newName.trim();
            if (newNameTrimmed) {
              onSampleUpdate(sampleId, { name: newNameTrimmed });
            }
          }}
        >
          Rename
        </Dropdown.Item>
        <Dropdown.Item onClick={() => onSampleDuplicate(sampleId)}>
          Duplicate
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${name}?`)) {
              onSampleDelete(sampleId);
            }
          }}
        >
          Delete
        </Dropdown.Item>
      </DropdownButton>
    );
  }
);

export default SampleDetail;

import React, { useEffect, useMemo, useState } from 'react';
import { Container, Button, Alert } from 'react-bootstrap';

import WaveformReadonly from './WaveformReadonly.js';
import VolcaTransferControl from './VolcaTransferControl.js';
import { useTargetAudioForSample } from './utils/audioData.js';
import { SampleContainer } from './store.js';
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

/**
 * @param {import('./store').SampleContainer} readonlySample
 */
function useSampleWithTemporalSlotNumber(readonlySample) {
  const readonlySlotNumber = readonlySample.metadata.slotNumber;
  const [slotNumber, setSlotNumber] = useState(readonlySlotNumber);
  useEffect(() => {
    setSlotNumber(readonlySlotNumber);
  }, [readonlySlotNumber]);
  const sample = useMemo(
    () =>
      readonlySample &&
      new SampleContainer({
        id: readonlySample.id,
        ...readonlySample.metadata,
        slotNumber,
      }),
    [readonlySample, slotNumber]
  );
  return { sample, setSlotNumber };
}

/**
 * @param {{
 *   sample: import('./store').SampleContainer;
 *   onSampleDuplicate: (id: string) => void;
 * }} props
 */
function SampleDetailReadonly({ sample: readonlySample, onSampleDuplicate }) {
  const { audioBuffer } = useTargetAudioForSample(readonlySample);
  const { sample, setSlotNumber } =
    useSampleWithTemporalSlotNumber(readonlySample);

  return (
    <Container fluid="sm">
      <h2>{sample.metadata.name}</h2>
      <p>
        <strong>Sampled:</strong>{' '}
        {new Date(sample.metadata.dateSampled).toLocaleString()}
      </p>
      <Alert variant="secondary">
        <Alert.Heading>This is a factory sample.</Alert.Heading>
        <p>
          If you want to trim the audio or adjust quality before transferring to
          the volca sample,{' '}
          <span className={classes.buttonLink}>
            <Button
              variant="link"
              className={classes.duplicateButtonLink}
              onClick={() => onSampleDuplicate(sample.id)}
            >
              make a duplicate
            </Button>
            .
          </span>
        </p>
      </Alert>
      <div className={classes.waveformReadonlyBoundingBox}>
        <WaveformReadonly sample={sample} previewAudio={audioBuffer} />
      </div>
      {/* {' '}
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          if (wav) {
            const blob = new Blob([wav], {
              type: 'audio/x-wav',
            });
            downloadBlob(blob, `${sample.metadata.name}.wav`);
          }
        }}
        disabled={!wav}
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
            `${sample.metadata.name}${userFileInfo ? userFileInfo.ext : '.wav'}`
          );
        }}
      >
        Download original file
      </Button>
      <br />
      <br />
      <SlotNumberInput
        slotNumber={sample.metadata.slotNumber}
        onSlotNumberUpdate={setSlotNumber}
      />
      <VolcaTransferControl sample={sample} />
    </Container>
  );
}

export default SampleDetailReadonly;

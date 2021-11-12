import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container, Button, Form, Alert } from 'react-bootstrap';

import WaveformReadonly from './WaveformReadonly.js';
import VolcaTransferControl from './VolcaTransferControl.js';
import {
  getTargetWavForSample,
  getAudioBufferForAudioFileData,
  useAudioPlaybackContext,
} from './utils/audioData.js';
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
  const { sample, setSlotNumber } =
    useSampleWithTemporalSlotNumber(readonlySample);
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
  const { playAudioBuffer } = useAudioPlaybackContext();
  // to be set when playback is started
  const stopPreviewPlayback = useRef(() => {});
  useEffect(() => {
    return () => stopPreviewPlayback.current();
  }, [sample]);
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
          If you want to trim the audio, change volume or adjust quality before
          transferring to the volca sample,{' '}
          <span className={classes.buttonLink}>
            <Button variant="link" onClick={() => onSampleDuplicate(sample.id)}>
              make a duplicate
            </Button>
            .
          </span>
        </p>
      </Alert>
      <div className={classes.waveformContainer}>
        <WaveformReadonly sample={sample} />
      </div>
      <br />
      <br />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={(e) => {
          if (audioBufferForAudioFileData) {
            stopPreviewPlayback.current = playAudioBuffer(
              audioBufferForAudioFileData
            );
          } else {
            const button = e.currentTarget;
            // wait until the audio buffer is ready then simulate a click event
            // to retry this handler. it's important that we simulate another
            // click because otherwise iOS won't let us play the audio later.
            setCallbackOnAudioBuffer({ fn: () => button.click() });
          }
        }}
      >
        Play audio preview
      </Button>
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
            `${sample.metadata.name}${userFileInfo ? userFileInfo.ext : '.wav'}`
          );
        }}
      >
        Download original file
      </Button>
      <br />
      <br />
      <Form.Group>
        <Form.Label>
          Quality bit depth ({sample.metadata.qualityBitDepth})
        </Form.Label>
        <Form.Range
          disabled
          value={sample.metadata.qualityBitDepth}
          step={1}
          min={8}
          max={16}
        />
      </Form.Group>
      <SlotNumberInput
        slotNumber={sample.metadata.slotNumber}
        onSlotNumberUpdate={setSlotNumber}
      />
      <br />
      <VolcaTransferControl sample={sample} />
    </Container>
  );
}

export default SampleDetailReadonly;

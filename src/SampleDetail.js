import React, { useCallback, useEffect, useRef, useState } from 'react';
import SevenSegmentDisplay, { Digit } from 'seven-segment-display';
import {
  Container,
  Dropdown,
  DropdownButton,
  Button,
  Form,
} from 'react-bootstrap';

import WaveformEdit from './WaveformEdit.js';
import VolcaTransferControl from './VolcaTransferControl.js';
import {
  getTargetWavForSample,
  getAudioBufferForAudioFileData,
  useAudioPlaybackContext,
} from './utils/audioData.js';
import { SampleContainer } from './store.js';

import classes from './SampleDetail.module.scss';
import { findDOMNode } from 'react-dom';

Digit.defaultProps.offOpacity = 0;

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
 * @param {{
 *   sample: import('./store').SampleContainer | null;
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
   * @type {(scaleCoefficient: number) => void}
   */
  const handleSetScaleCoefficient = useCallback(
    (scaleCoefficient) =>
      sampleId && onSampleUpdate(sampleId, { scaleCoefficient }),
    [sampleId, onSampleUpdate]
  );
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
    if (sample) {
      let cancelled = false;
      getTargetWavForSample(sample).then(({ data }) => {
        if (!cancelled) {
          setTargetWav(data);
        }
      });
    }
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
  const { playAudioBuffer, isAudioBusy } = useAudioPlaybackContext();
  // to be set when playback is started
  const stopPreviewPlayback = useRef(() => {});
  useEffect(() => {
    return () => stopPreviewPlayback.current();
  }, [sample]);
  if (!sample) {
    return null;
  }
  return (
    <Container fluid="sm">
      <h2>
        {sample.metadata.name}
        <DropdownButton
          style={{ display: 'inline-block', float: 'right' }}
          variant="light"
          align="end"
          title="options"
        >
          <Dropdown.Item
            onClick={() => {
              const newName = prompt(
                `Choose a new name for the sample "${sample.metadata.name}":`,
                sample.metadata.name
              );
              const newNameTrimmed = newName && newName.trim();
              if (newNameTrimmed) {
                onSampleUpdate(sample.id, { name: newNameTrimmed });
              }
            }}
          >
            Rename
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onSampleDuplicate(sample.id)}>
            Duplicate
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete ${sample.metadata.name}?`
                )
              ) {
                onSampleDelete(sample.id);
              }
            }}
          >
            Delete
          </Dropdown.Item>
        </DropdownButton>
      </h2>
      <p>
        <strong>Sampled:</strong>{' '}
        {new Date(sample.metadata.dateSampled).toLocaleString()}
        <br />
        <strong>Updated:</strong>{' '}
        {new Date(sample.metadata.dateModified).toLocaleString()}
      </p>
      <br />
      <br />
      <div className={classes.waveformContainer}>
        <WaveformEdit
          onSetTrimFrames={handleSetTrimFrames}
          onSetScaleCoefficient={handleSetScaleCoefficient}
          sample={sample}
        />
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
        disabled={isAudioBusy}
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
          value={sample.metadata.qualityBitDepth}
          step={1}
          min={8}
          max={16}
          onChange={(e) => {
            const qualityBitDepth = Number(e.target.value);
            onSampleUpdate(sample.id, { qualityBitDepth });
          }}
        />
      </Form.Group>
      <Form.Group>
        <Form.Label>Slot number</Form.Label>
        <Form.Control
          type="number"
          value={sample.metadata.slotNumber}
          step={1}
          min={0}
          max={199}
          onChange={(e) => {
            const slotNumber = Number(e.target.value);
            onSampleUpdate(sample.id, { slotNumber });
          }}
        />
      </Form.Group>
      <br />
      <div
        className={classes.slotNumber}
        title={`Slot ${sample.metadata.slotNumber}`}
      >
        <SevenSegmentDisplay
          value="8888"
          color="var(--bs-gray-dark)"
          strokeColor="transparent"
          digitCount={4}
        />
        <SevenSegmentDisplay
          ref={
            /**
             * @param {React.Component} instance
             */
            (instance) => {
              const svg = /** @type {SVGElement} */ (findDOMNode(instance));
              if (svg) {
                svg.querySelectorAll(classes.point).forEach((oldPoint) => {
                  svg.removeChild(oldPoint);
                });
                const point = document.createElementNS(
                  'http://www.w3.org/2000/svg',
                  'circle'
                );
                point.classList.add(classes.point);
                svg.appendChild(point);
              }
            }
          }
          // the 5 actually represents an S
          value={`5${String(sample.metadata.slotNumber).padStart(3, '0')}`}
          digitProps={{ color: 'var(--bs-primary)' }}
          digitCount={4}
        />
      </div>
      <br />
      <br />
      <VolcaTransferControl sample={sample} />
    </Container>
  );
}

export default SampleDetail;

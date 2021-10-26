import React, { useCallback, useEffect, useRef, useState } from 'react';
import { styled } from 'tonami';

import WaveformEdit from './WaveformEdit.js';
import {
  getTargetWavForSample,
  getSourceAudioBuffer,
  getAudioBufferForAudioFileData,
  useAudioPlaybackContext,
} from './utils/audioData.js';
import { SampleContainer } from './store.js';
import VolcaTransferControl from './VolcaTransferControl.js';
import { getSamplePeaksForSourceFile } from './utils/waveform.js';

const SampleDetailContainer = styled.div({
  paddingLeft: '2rem',
});

const WaveformContainer = styled.div({
  height: '200px',
  backgroundColor: '#f3f3f3',
  maxWidth: '400px',
});

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
 *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdate) => void;
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
  const [sampleLength, setSampleLength] = useState(0);
  const sourceFileId = sample && sample.metadata.sourceFileId;
  useEffect(() => {
    // when the source file id changes, we should temporarily set the sample
    // length to 0 so that we can't make changes to the trimming until the
    // sample length is loaded
    setSampleLength(0);
    if (sourceFileId) {
      getSourceAudioBuffer(sourceFileId, false).then((audioBuffer) =>
        setSampleLength(audioBuffer.length)
      );
    }
  }, [sourceFileId]);
  const sampleId = sample && sample.id;
  /**
   * @type {(scaleCoefficient: number) => void}
   */
  const handleSetScaleCoefficient = useCallback(
    (scaleCoefficient) =>
      sampleId && onSampleUpdate(sampleId, { scaleCoefficient }),
    [sampleId, onSampleUpdate]
  );
  const { playAudioBuffer, isAudioBusy } = useAudioPlaybackContext();
  // to be set when playback is started
  const stopPreviewPlayback = useRef(() => {});
  useEffect(() => {
    return () => stopPreviewPlayback.current();
  }, [sample]);
  if (!sample) {
    return null;
  }
  const maxTrimStart = Math.max(
    0,
    sampleLength - sample.metadata.trim.frames[1]
  );
  const maxTrimEnd = Math.max(0, sampleLength - sample.metadata.trim.frames[0]);
  return (
    <SampleDetailContainer>
      <h3>{sample.metadata.name}</h3>
      <button type="button" onClick={() => onSampleDuplicate(sample.id)}>
        Duplicate
      </button>
      <button
        type="button"
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
        Remove
      </button>
      <h4>
        Last edited: {new Date(sample.metadata.dateModified).toLocaleString()}
      </h4>
      <h4>Sampled: {new Date(sample.metadata.dateSampled).toLocaleString()}</h4>
      <label>
        <h4>Trim start</h4>
        <input
          type="number"
          value={sample.metadata.trim.frames[0]}
          step={1}
          min={0}
          max={maxTrimStart}
          onChange={async (e) => {
            if (sampleLength) {
              const trimStart = Number(e.target.value);
              /**
               * @type {[number, number]}
               */
              const trimFrames = [
                Math.min(trimStart, maxTrimStart),
                sample.metadata.trim.frames[1],
              ];
              const waveformPeaks = await getSamplePeaksForSourceFile(
                sample.metadata.sourceFileId,
                trimFrames
              );
              onSampleUpdate(sample.id, {
                trim: {
                  frames: trimFrames,
                  waveformPeaks,
                },
              });
            } else {
              onSampleUpdate(sample.id, {
                trim: { ...sample.metadata.trim },
              });
            }
          }}
        />
      </label>
      <label>
        <h4>Trim end</h4>
        <input
          type="number"
          value={sample.metadata.trim.frames[1]}
          step={1}
          min={0}
          max={maxTrimEnd}
          onChange={async (e) => {
            if (sampleLength) {
              const trimEnd = Number(e.target.value);
              /**
               * @type {[number, number]}
               */
              const trimFrames = [
                sample.metadata.trim.frames[0],
                Math.min(trimEnd, maxTrimEnd),
              ];
              const waveformPeaks = await getSamplePeaksForSourceFile(
                sample.metadata.sourceFileId,
                trimFrames
              );
              onSampleUpdate(sample.id, {
                trim: {
                  frames: trimFrames,
                  waveformPeaks,
                },
              });
            } else {
              onSampleUpdate(sample.id, {
                trim: { ...sample.metadata.trim },
              });
            }
          }}
        />
      </label>
      <WaveformContainer>
        <WaveformEdit
          onSetTrimFrames={() => null}
          onSetScaleCoefficient={handleSetScaleCoefficient}
          sample={sample}
        />
        <button
          type="button"
          onClick={async () => {
            const { data } = await getTargetWavForSample(sample);
            const audioBuffer = await getAudioBufferForAudioFileData(data);
            stopPreviewPlayback.current = playAudioBuffer(audioBuffer);
          }}
          disabled={isAudioBusy}
        >
          play
        </button>
        <button
          type="button"
          onClick={async () => {
            const { data } = await getTargetWavForSample(sample);
            const blob = new Blob([data], {
              type: 'audio/x-wav',
            });
            downloadBlob(blob, `${sample.metadata.name}.wav`);
          }}
        >
          download
        </button>
        <button
          type="button"
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
          download (orig)
        </button>
      </WaveformContainer>
      <h4>Quality bit depth: {sample.metadata.qualityBitDepth}</h4>
      <input
        type="range"
        value={sample.metadata.qualityBitDepth}
        step={1}
        min={8}
        max={16}
        onChange={(e) => {
          const qualityBitDepth = Number(e.target.value);
          onSampleUpdate(sample.id, { qualityBitDepth });
        }}
      />
      <label>
        <h4>Slot number</h4>
        <input
          type="number"
          value={sample.metadata.slotNumber}
          step={1}
          min={0}
          max={99}
          onChange={(e) => {
            const slotNumber = Number(e.target.value);
            onSampleUpdate(sample.id, { slotNumber });
          }}
        />
      </label>
      <VolcaTransferControl sample={sample} />
    </SampleDetailContainer>
  );
}

export default SampleDetail;

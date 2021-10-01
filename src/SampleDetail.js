import React, { useCallback } from 'react';

import Waveform from './Waveform';
import { getTargetWavForSample } from './utils/audioData';
import { getSampleBuffer } from './utils/syro';
import { SampleContainer } from './store';

{
  const css = `
.sampleDetail {
  padding-left: 2rem;
}
  `;
  const style = document.createElement('style');
  style.innerHTML = css;
  document.body.appendChild(style);
}
/**
 * @type {Record<string, string>}
 */
const classes = ['sampleDetail'].reduce(
  (classes, className) => ({ ...classes, [className]: className }),
  {}
);

/**
 * @param {Uint8Array} audioFileBuffer audio file to transform into audio buffer
 */
function playAudioFile(audioFileBuffer) {
  const blob = new Blob([audioFileBuffer], {
    type: 'audio/x-wav',
  });
  const audioElement = document.createElement('audio');
  audioElement.src = URL.createObjectURL(blob);
  audioElement.play();
  audioElement.onended = () => {
    URL.revokeObjectURL(audioElement.src);
  };
}

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
  /**
   * @type {(scaleCoefficient: number) => void}
   */
  const handleSetScaleCoefficient = useCallback(
    (scaleCoefficient) =>
      sample && onSampleUpdate(sample.id, { scaleCoefficient }),
    [sample, onSampleUpdate]
  );
  if (!sample) {
    return null;
  }
  return (
    <div className={classes.sampleDetail}>
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
          value={sample.metadata.trimFrames[0]}
          step={1}
          min={0}
          onChange={(e) => {
            const trimStart = Number(e.target.value);
            onSampleUpdate(sample.id, {
              trimFrames: [trimStart, sample.metadata.trimFrames[1]],
            });
          }}
        />
      </label>
      <label>
        <h4>Trim end</h4>
        <input
          type="number"
          value={sample.metadata.trimFrames[1]}
          step={1}
          min={0}
          onChange={(e) => {
            const trimEnd = Number(e.target.value);
            onSampleUpdate(sample.id, {
              trimFrames: [sample.metadata.trimFrames[0], trimEnd],
            });
          }}
        />
      </label>
      <div
        style={{
          height: 200,
          backgroundColor: '#f3f3f3',
          maxWidth: 400,
        }}
      >
        <Waveform
          onSetTrimFrames={() => null}
          onSetScaleCoefficient={handleSetScaleCoefficient}
          sample={sample}
        />
        <button
          type="button"
          onClick={async () => {
            const { data } = await getTargetWavForSample(sample);
            playAudioFile(data);
          }}
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
      </div>
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
      <button
        type="button"
        onClick={async () => {
          try {
            const sampleBuffer = await getSampleBuffer(sample, console.log);
            playAudioFile(sampleBuffer);
          } catch (err) {
            console.error(err);
          }
        }}
      >
        transfer to volca sample
      </button>
    </div>
  );
}

export default SampleDetail;

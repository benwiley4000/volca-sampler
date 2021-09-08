import React from 'react';

import Waveform from './Waveform';
import { SampleContainer } from './store';
import {
  convertWavTo16BitMono,
  getSampleBuffer,
  getAudioBufferForAudioFileData,
  playAudioBuffer,
} from './utils';

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
 * @param {{
 *   sample: SampleContainer | null;
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
        <h4>Clip start</h4>
        <input
          type="number"
          value={sample.metadata.clip[0]}
          step={0.1}
          min={0}
          onChange={(e) => {
            const clipStart = Number(e.target.value);
            onSampleUpdate(sample.id, {
              clip: [clipStart, sample.metadata.clip[1]],
            });
          }}
        />
      </label>
      <label>
        <h4>Clip end</h4>
        <input
          type="number"
          value={sample.metadata.clip[1]}
          step={0.1}
          min={0}
          onChange={(e) => {
            const clipEnd = Number(e.target.value);
            onSampleUpdate(sample.id, {
              clip: [sample.metadata.clip[0], clipEnd],
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
          onSetClip={() => null}
          onSetNormalize={(normalize) =>
            onSampleUpdate(sample.id, { normalize })
          }
          sample={sample}
        />
        <button
          type="button"
          disabled={sample.metadata.normalize === 1}
          onClick={() => onSampleUpdate(sample.id, { normalize: 1 })}
        >
          Normalize
        </button>
        <button
          type="button"
          disabled={!sample.metadata.normalize}
          onClick={() => onSampleUpdate(sample.id, { normalize: false })}
        >
          Original level
        </button>
        <button
          type="button"
          onClick={async () => {
            const { data } = await convertWavTo16BitMono(sample);
            const audioBuffer = await getAudioBufferForAudioFileData(data);
            playAudioBuffer(audioBuffer);
          }}
        >
          regular play
        </button>
        <button
          type="button"
          onClick={async () => {
            const { data } = await convertWavTo16BitMono(sample);
            const blob = new Blob([data], {
              type: 'audio/x-wav',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sample.metadata.name}.wav`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
        >
          download
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
            const audioBuffer = await getAudioBufferForAudioFileData(
              sampleBuffer
            );
            playAudioBuffer(audioBuffer);
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

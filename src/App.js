import React, { useCallback, useEffect, useState } from 'react';

import Waveform from './Waveform';
import { SampleContainer, storeWavSourceFile } from './store';
import {
  convertWavTo16BitMono,
  getSampleBuffer,
  getAudioBufferForAudioFileData,
  playAudioBuffer,
  captureAudio,
  getAudioInputDevices,
} from './utils';

{
  const css = `
.volcaSampler {
  padding: 2rem;
  display: flex;
  height: 100%;
}

.sampleList {
  width: 200px;
  flex-shrink: 0;
  overflow: auto;
  padding-right: 0.5rem;
}

.sampleListItem {
  padding: 0.5rem;
  border: 1px solid grey;
  cursor: pointer;
}

.sampleListItem:not:nth-child(1) {
  margin-top: 1rem;
}

.focusedSample {
  margin-left: 2rem;
  flex-grow: 1;
}
  `;
  const style = document.createElement('style');
  style.innerHTML = css;
  document.body.appendChild(style);
}
/**
 * @type {Record<string, string>}
 */
const classes = [
  'volcaSampler',
  'sampleList',
  'sampleListItem',
  'focusedSample',
].reduce((classes, className) => ({ ...classes, [className]: className }), {});

function App() {
  const [samples, setSamples] = useState(
    /** @type {Map<string, SampleContainer>} */ (new Map())
  );
  const [focusedSampleId, setFocusedSampleId] = useState(
    /** @type {string | null} */ (null)
  );
  const [loadingSamples, setLoadingSamples] = useState(true);
  /**
   * @typedef {'ready' | 'capturing' | 'preparing' | 'error' | 'idle'} CaptureState
   */
  const [captureState, setCaptureState] = useState(
    /** @type {CaptureState} */ ('idle')
  );
  const [captureDevices, setCaptureDevices] = useState(
    /** @type {Map<string, import('./utils').AudioDeviceInfoContainer> | null} */ (
      null
    )
  );
  const [selectedCaptureDeviceId, setSelectedCaptureDeviceId] = useState('');
  useEffect(() => {
    getAudioInputDevices()
      .then((devices) => devices.filter((d) => d.device.kind === 'audioinput'))
      .then((devices) => {
        if (devices.length) {
          setCaptureDevices(
            new Map(devices.map((d) => [d.device.deviceId, d]))
          );
          setSelectedCaptureDeviceId((id) => id || devices[0].device.deviceId);
        }
      });
  }, []);
  const [selectedChannelCount, setSelectedChannelCount] = useState(1);
  useEffect(() => {
    const selectedDeviceInfo =
      captureDevices && captureDevices.get(selectedCaptureDeviceId);
    if (selectedDeviceInfo) {
      setSelectedChannelCount(selectedDeviceInfo.channelsAvailable);
    }
  }, [captureDevices, selectedCaptureDeviceId]);
  const [recordingError, setRecordingError] = useState(
    /** @type {Error | null} */ (null)
  );
  // to be set when recording is started
  const [stop, setStop] = useState({ fn: () => {} });

  useEffect(() => {
    // TODO: error handling
    SampleContainer.getAllFromStorage()
      .then((storedSamples) => {
        setSamples(
          (samples) =>
            new Map([
              ...samples,
              ...storedSamples.map(
                (sample) =>
                  /** @type {[string, SampleContainer]} */ ([sample.id, sample])
              ),
            ])
        );
        // TODO: automatically set focused sample id to first.. easier with useReducer maybe
      })
      .finally(() => {
        setLoadingSamples(false);
      });
  }, []);

  useEffect(() => {
    if (samples.size && !(focusedSampleId && samples.has(focusedSampleId))) {
      setFocusedSampleId([...samples.values()][0].id);
    }
  }, [samples, focusedSampleId]);

  useEffect(() => {
    if (recordingError) {
      setCaptureState('error');
    }
  }, [recordingError]);

  const handleBeginRecording = useCallback(async () => {
    const { mediaRecording, stop } = await captureAudio({
      deviceId: selectedCaptureDeviceId,
      channelCount: selectedChannelCount,
      onStart: () => setCaptureState('capturing'),
    });
    setStop({ fn: stop });
    /**
     * @type {Uint8Array}
     */
    let wavBuffer;
    try {
      wavBuffer = await mediaRecording;
    } catch (err) {
      setRecordingError(err);
      return;
    }
    setCaptureState('preparing');
    const id = await storeWavSourceFile(wavBuffer);
    const sample = new SampleContainer({
      name: 'New one',
      sourceFileId: id,
    });
    await sample.persist();
    setSamples((samples) => new Map([[sample.id, sample], ...samples]));
    setFocusedSampleId(sample.id);
    setCaptureState('idle');
  }, [selectedCaptureDeviceId, selectedChannelCount]);

  return (
    <div className={classes.volcaSampler}>
      <div className={classes.sampleList}>
        <div
          className={classes.sampleListItem}
          onClick={() =>
            setCaptureState((captureState) =>
              captureState === 'idle' ? 'ready' : captureState
            )
          }
        >
          New Sample
        </div>
        {[...samples].map(([id, sample]) => (
          <div
            className={classes.sampleListItem}
            key={id}
            onClick={() => {
              setFocusedSampleId(id);
              setCaptureState((captureState) =>
                !['capturing', 'preparing'].includes(captureState)
                  ? 'idle'
                  : captureState
              );
            }}
          >
            <div>{sample.metadata.name}</div>
            <div>
              Updated {new Date(sample.metadata.dateModified).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div className={classes.focusedSample}>
        {captureState === 'idle' ? (
          (() => {
            const sample = focusedSampleId && samples.get(focusedSampleId);
            if (!sample) {
              return;
            }
            return (
              <div>
                <h3>{sample.metadata.name}</h3>
                <button
                  type="button"
                  onClick={() => {
                    const newSample = sample.duplicate();
                    setSamples(
                      (samples) =>
                        new Map([[newSample.id, newSample], ...samples])
                    );
                  }}
                >
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
                      sample.remove();
                      setSamples((samples) => {
                        const newSamples = new Map(samples);
                        newSamples.delete(sample.id);
                        return newSamples;
                      });
                    }
                  }}
                >
                  Remove
                </button>
                <h4>
                  Last edited:{' '}
                  {new Date(sample.metadata.dateModified).toLocaleString()}
                </h4>
                <h4>
                  Sampled:{' '}
                  {new Date(sample.metadata.dateSampled).toLocaleString()}
                </h4>
                <label>
                  <h4>Clip start</h4>
                  <input
                    type="number"
                    value={sample.metadata.clip[0]}
                    step={0.1}
                    min={0}
                    onChange={(e) => {
                      const clipStart = Number(e.target.value);
                      setSamples((samples) =>
                        new Map(samples).set(
                          sample.id,
                          sample.update({
                            clip: [clipStart, sample.metadata.clip[1]],
                          })
                        )
                      );
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
                      setSamples((samples) =>
                        new Map(samples).set(
                          sample.id,
                          sample.update({
                            clip: [sample.metadata.clip[0], clipEnd],
                          })
                        )
                      );
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
                      setSamples((samples) =>
                        new Map(samples).set(
                          sample.id,
                          sample.update({ normalize })
                        )
                      )
                    }
                    sample={sample}
                  />
                  <button
                    type="button"
                    disabled={sample.metadata.normalize === 1}
                    onClick={() =>
                      setSamples((samples) =>
                        new Map(samples).set(
                          sample.id,
                          sample.update({ normalize: 1 })
                        )
                      )
                    }
                  >
                    Normalize
                  </button>
                  <button
                    type="button"
                    disabled={!sample.metadata.normalize}
                    onClick={() =>
                      setSamples((samples) =>
                        new Map(samples).set(
                          sample.id,
                          sample.update({ normalize: false })
                        )
                      )
                    }
                  >
                    Original level
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const { data } = await convertWavTo16BitMono(sample);
                      const audioBuffer = await getAudioBufferForAudioFileData(
                        data
                      );
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
                    setSamples((samples) =>
                      new Map(samples).set(
                        sample.id,
                        sample.update({ qualityBitDepth })
                      )
                    );
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
                      setSamples((samples) =>
                        new Map(samples).set(
                          sample.id,
                          sample.update({ slotNumber })
                        )
                      );
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const sampleBuffer = await getSampleBuffer(
                        sample,
                        console.log
                      );
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
          })()
        ) : (
          <>
            {captureDevices ? (
              <div>
                <label>
                  Capture Device
                  <select value={selectedCaptureDeviceId}>
                    {[...captureDevices].map(([id, { device }]) => (
                      <option
                        key={id}
                        value={id}
                        onClick={() => setSelectedCaptureDeviceId(id)}
                      >
                        {device.label || id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Channel count
                  <select value={selectedChannelCount}>
                    {[1, 2].map((count) => (
                      <option
                        key={count}
                        value={count}
                        onClick={() => setSelectedChannelCount(count)}
                        disabled={
                          !captureDevices.has(selectedCaptureDeviceId) ||
                          /** @type {import('./utils').AudioDeviceInfoContainer} */ (
                            captureDevices.get(selectedCaptureDeviceId)
                          ).channelsAvailable < count
                        }
                      >
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              'Loading capture devices...'
            )}
            <button
              type="button"
              onClick={
                captureState === 'capturing' ? stop.fn : handleBeginRecording
              }
              disabled={captureState === 'preparing'}
            >
              {captureState === 'capturing' ? 'Stop' : 'Record'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

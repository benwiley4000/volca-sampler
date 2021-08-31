// @ts-check

import React, { useCallback, useEffect, useState } from 'react';

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
  const [samples, setSamples] = useState(/** @type {SampleContainer[]} */ ([]));
  const [focusedSampleIndex, setFocusedSampleIndex] = useState(0);
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
      .then((storedSamples) =>
        setSamples((samples) => samples.concat(storedSamples))
      )
      .finally(() => {
        setLoadingSamples(false);
      });
  }, []);

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
    setSamples((samples) => [sample, ...samples]);
    setFocusedSampleIndex(0);
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
        {samples.map((sample, sampleIndex) => (
          <div
            className={classes.sampleListItem}
            key={sample.id}
            onClick={() => {
              setFocusedSampleIndex(sampleIndex);
              setCaptureState((captureState) =>
                !['capturing', 'preparing'].includes(captureState)
                  ? 'idle'
                  : captureState
              );
            }}
          >
            <div>{sample.metadata.name}</div>
            <div>Updated {new Date(sample.metadata.dateModified).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className={classes.focusedSample}>
        {captureState === 'idle' ? (
          (() => {
            const sample = samples[focusedSampleIndex];
            if (!sample) {
              return 'Loading...';
            }
            return (
              <div>
                {JSON.stringify(sample, null, 1)}
                <button
                  type="button"
                  onClick={() => {
                    setSamples((samples) => [sample.duplicate(), ...samples]);
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSamples((samples) =>
                      samples.map((s) =>
                        s === sample ? sample.update({ qualityBitDepth: 8 }) : s
                      )
                    );
                  }}
                >
                  8 bit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSamples((samples) =>
                      samples.map((s) =>
                        s === sample
                          ? sample.update({ qualityBitDepth: 16 })
                          : s
                      )
                    );
                  }}
                >
                  16 bit
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
                  encoded play
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
                          captureDevices.get(selectedCaptureDeviceId)
                            .channelsAvailable < count
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

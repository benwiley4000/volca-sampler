import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Form, Button, Collapse } from 'react-bootstrap';
import { styled } from 'tonami';

import { getAudioBufferForAudioFileData } from './utils/audioData.js';
import { captureAudio, getAudioInputDevices } from './utils/recording.js';

const SampleRecordDiv = styled.div({});

const captureDevicePreferenceKey = 'capture_device_preference';

/**
 * @typedef {{ deviceId: string; channelCount: number }} CaptureDevicePreference
 */

/**
 * @type {Map<string, import('./utils/recording').AudioDeviceInfoContainer> | null}
 */
let cachedCaptureDevices = null;

/**
 * @typedef {(audioFileBuffer: Uint8Array, userFile?: File) => void} RecordingCallback
 */

/**
 * @param {RecordingCallback} onRecordFinish
 */
function useMediaRecording(onRecordFinish) {
  const restoringCaptureDevice = useRef(
    /** @type {CaptureDevicePreference | null} */ (
      JSON.parse(localStorage.getItem(captureDevicePreferenceKey) || 'null')
    )
  );
  const [captureDevices, setCaptureDevices] = useState(cachedCaptureDevices);
  const [accessState, setAccessState] = useState(
    /** @type {'pending' | 'ok' | 'denied' | 'unavailable'} */ (
      captureDevices ? 'ok' : 'pending'
    )
  );
  const [selectedCaptureDeviceId, setSelectedCaptureDeviceId] = useState('');
  useEffect(() => {
    cachedCaptureDevices = captureDevices;
    setAccessState('ok');
  }, [captureDevices]);
  const refreshCaptureDevices = useCallback(() => {
    let cancelled = false;
    getAudioInputDevices()
      .then((devices) => {
        if (cancelled) {
          return;
        }
        if (devices.length) {
          setCaptureDevices(
            new Map(devices.map((d) => [d.device.deviceId, d]))
          );
          setSelectedCaptureDeviceId((id) => {
            if (id) {
              restoringCaptureDevice.current = null;
              return id;
            }
            if (
              restoringCaptureDevice.current &&
              devices.find(
                ({ device }) =>
                  /** @type {NonNullable<CaptureDevicePreference>} */ (
                    restoringCaptureDevice.current
                  ).deviceId === device.deviceId
              )
            ) {
              return restoringCaptureDevice.current.deviceId;
            }
            restoringCaptureDevice.current = null;
            return devices[0].device.deviceId;
          });
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            setAccessState('denied');
            return;
          }
          if (err.name === 'NotFoundError') {
            setAccessState('unavailable');
            return;
          }
        }
        throw err;
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(refreshCaptureDevices, [refreshCaptureDevices]);
  const [selectedChannelCount, setSelectedChannelCount] = useState(1);
  useEffect(() => {
    const selectedDeviceInfo =
      captureDevices && captureDevices.get(selectedCaptureDeviceId);
    if (selectedDeviceInfo) {
      if (
        restoringCaptureDevice.current &&
        restoringCaptureDevice.current.deviceId ===
          selectedDeviceInfo.device.deviceId &&
        restoringCaptureDevice.current.channelCount <=
          selectedDeviceInfo.channelsAvailable
      ) {
        setSelectedChannelCount(restoringCaptureDevice.current.channelCount);
      } else {
        setSelectedChannelCount(selectedDeviceInfo.channelsAvailable);
      }
      restoringCaptureDevice.current = null;
    }
  }, [captureDevices, selectedCaptureDeviceId]);
  useEffect(() => {
    if (selectedCaptureDeviceId) {
      localStorage.setItem(
        captureDevicePreferenceKey,
        JSON.stringify({
          deviceId: selectedCaptureDeviceId,
          channelCount: selectedChannelCount,
        })
      );
    }
  }, [selectedCaptureDeviceId, selectedChannelCount]);
  /**
   * @typedef {'ready' | 'capturing' | 'finalizing' | 'error'} CaptureState
   */
  const [captureState, setCaptureState] = useState(
    /** @type {CaptureState} */ ('ready')
  );
  const [recordingError, setRecordingError] = useState(
    /** @type {unknown} */ (null)
  );
  // to be set when recording is started
  const [stop, setStop] = useState({
    /**
     * @param {boolean} [cancel]
     */
    fn(cancel) {},
  });
  const handleBeginRecording = useCallback(async () => {
    let cancelled = false;
    const { mediaRecording, stop } = await captureAudio({
      deviceId: selectedCaptureDeviceId,
      channelCount: selectedChannelCount,
      onStart: () => setCaptureState('capturing'),
    });
    setStop({
      fn(cancel) {
        stop();
        if (cancel) {
          cancelled = true;
        }
      },
    });
    /**
     * @type {Uint8Array}
     */
    let wavBuffer;
    try {
      wavBuffer = await mediaRecording;
    } catch (err) {
      setRecordingError(err);
      setCaptureState('error');
      return;
    }
    if (cancelled) {
      setCaptureState('ready');
    } else {
      setCaptureState('finalizing');
      onRecordFinish(wavBuffer);
    }
  }, [selectedCaptureDeviceId, selectedChannelCount, onRecordFinish]);
  return {
    captureDevices,
    accessState,
    selectedCaptureDeviceId,
    selectedChannelCount,
    captureState,
    recordingError,
    refreshCaptureDevices,
    setSelectedCaptureDeviceId,
    setSelectedChannelCount,
    beginRecording: handleBeginRecording,
    stopRecording: stop.fn,
  };
}

/**
 * @param {{ onRecordFinish: RecordingCallback }} props
 */
function SampleRecord({ onRecordFinish }) {
  const {
    captureDevices,
    accessState,
    selectedCaptureDeviceId,
    selectedChannelCount,
    captureState,
    recordingError,
    refreshCaptureDevices,
    setSelectedCaptureDeviceId,
    setSelectedChannelCount,
    beginRecording,
    stopRecording,
  } = useMediaRecording(onRecordFinish);

  const [showingCaptureConfig, setShowingCaptureConfig] = useState(false);

  return (
    <SampleRecordDiv>
      {accessState === 'denied' ? (
        <p>
          Looks like you didn't grant access to your audio input device. Please
          give Volca Sampler access, then{' '}
          <Button
            type="button"
            variant="secondary"
            onClick={refreshCaptureDevices}
          >
            try again
          </Button>
        </p>
      ) : accessState === 'unavailable' ? (
        <p>
          Volca Sampler couldn't find any audio input devices. Please connect
          one, then{' '}
          <Button
            type="button"
            variant="secondary"
            onClick={refreshCaptureDevices}
          >
            try again
          </Button>
        </p>
      ) : (
        <div>
          <h2>Send a new sound to your Volca Sample!</h2>
          <Button
            type="button"
            variant={captureState === 'capturing' ? 'danger' : 'primary'}
            size="lg"
            style={{ width: 250 }}
            onClick={
              captureState === 'capturing'
                ? () => stopRecording()
                : beginRecording
            }
            disabled={captureState === 'finalizing'}
          >
            {['capturing', 'finalizing'].includes(captureState)
              ? 'Finished recording'
              : 'Start recording'}
          </Button>
          {['capturing', 'finalizing'].includes(captureState) ? (
            <>
              <br />
              <br />
              <Button
                style={{ width: 250 }}
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => stopRecording(true)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <br />
              <Button
                style={{ width: 250 }}
                type="button"
                variant="light"
                size="sm"
                onClick={() => setShowingCaptureConfig((showing) => !showing)}
              >
                Audio input settings {showingCaptureConfig ? '▲' : '▼'}
              </Button>
              <Collapse in={showingCaptureConfig}>
                <div>
                  <Form.Group>
                    <Form.Label>Capture Device</Form.Label>
                    <Form.Select
                      style={{ width: 250 }}
                      value={selectedCaptureDeviceId}
                      onChange={(e) =>
                        setSelectedCaptureDeviceId(e.target.value)
                      }
                    >
                      {captureDevices && accessState === 'ok' ? (
                        [...captureDevices].map(([id, { device }]) => (
                          <option key={id} value={id}>
                            {device.label || id}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          Loading devices...
                        </option>
                      )}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Input channels</Form.Label>
                    <Form.Select
                      style={{ width: 250 }}
                      value={selectedChannelCount}
                      onChange={(e) =>
                        setSelectedChannelCount(Number(e.target.value))
                      }
                    >
                      {[1, 2].map((count) => (
                        <option
                          key={count}
                          value={count}
                          disabled={
                            !captureDevices ||
                            !captureDevices.has(selectedCaptureDeviceId) ||
                            /** @type {import('./utils/recording').AudioDeviceInfoContainer} */ (
                              captureDevices.get(selectedCaptureDeviceId)
                            ).channelsAvailable < count
                          }
                        >
                          {count === 1 ? 'Mono' : 'Stereo (summed to mono)'}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <br />
                </div>
              </Collapse>
            </>
          )}
        </div>
      )}
      {(captureState === 'error' && recordingError) || null}
      <br />
      <Button
        style={{ width: 250 }}
        type="button"
        variant="secondary"
        onClick={(e) => {
          const input = e.currentTarget.querySelector('input');
          if (input && e.target !== input) {
            input.click();
          }
        }}
      >
        Or import an audio file
        <input
          hidden
          type="file"
          accept="audio/*,.wav,.mp3,.ogg"
          onChange={(e) => {
            if (e.target.files && e.target.files.length) {
              const file = e.target.files[0];
              file.arrayBuffer().then(async (arrayBuffer) => {
                const audioFileBuffer = new Uint8Array(arrayBuffer);
                /**
                 * @type {AudioBuffer}
                 */
                let audioBuffer;
                try {
                  audioBuffer = await getAudioBufferForAudioFileData(
                    audioFileBuffer
                  );
                } catch (err) {
                  alert('Unsupported audio format detected');
                  return;
                }
                if (audioBuffer.length > 10 * audioBuffer.sampleRate) {
                  alert(
                    'Please select an audio file no more than 10 seconds long'
                  );
                  return;
                }
                onRecordFinish(audioFileBuffer, file);
              });
            }
          }}
        />
      </Button>
    </SampleRecordDiv>
  );
}

export default SampleRecord;

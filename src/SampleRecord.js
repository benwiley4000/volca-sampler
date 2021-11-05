import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Form, Button, Collapse } from 'react-bootstrap';

import {
  findSamplePeak,
  getAudioBufferForAudioFileData,
} from './utils/audioData.js';
import { captureAudio, getAudioInputDevices } from './utils/recording.js';

import classes from './SampleRecord.module.scss';

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
 * @param {(channels: Float32Array[]) => void} onRecordUpdate
 * @param {RecordingCallback} onRecordFinish
 */
function useMediaRecording(onRecordUpdate, onRecordFinish) {
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
  const [maxSamples, setMaxSamples] = useState(0);
  const handleBeginRecording = useCallback(async () => {
    let cancelled = false;
    const { mediaRecording, stop } = await captureAudio({
      deviceId: selectedCaptureDeviceId,
      channelCount: selectedChannelCount,
      onStart: (maxSamples) => {
        setMaxSamples(maxSamples);
        setCaptureState('capturing');
      },
      onUpdate: onRecordUpdate,
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
  }, [
    selectedCaptureDeviceId,
    selectedChannelCount,
    onRecordUpdate,
    onRecordFinish,
  ]);
  return {
    captureDevices,
    accessState,
    selectedCaptureDeviceId,
    selectedChannelCount,
    captureState,
    recordingError,
    maxSamples,
    refreshCaptureDevices,
    setSelectedCaptureDeviceId,
    setSelectedChannelCount,
    beginRecording: handleBeginRecording,
    stopRecording: stop.fn,
  };
}

const groupPixelWidth = 2;

/**
 * @param {{
 *   canvas: HTMLCanvasElement;
 *   peaks: Float32Array;
 *   peakOffset: number;
 *   scaleCoefficient: number;
 * }} opts
 */
function drawRecordingPeaks({ canvas, peaks, peakOffset, scaleCoefficient }) {
  const barColor = '#fff';
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  ctx.imageSmoothingEnabled = false;
  const { height } = canvas;
  ctx.fillStyle = barColor;
  for (let i = peakOffset; i < peaks.length; i++) {
    const peak = peaks[i];
    if (peak === 0) {
      continue;
    }
    const basePeakHeight = height * peak; // float
    // make the bar always at least 1px tall to avoid empty sections
    const scaledPeakHeight = Math.max(
      Math.round(scaleCoefficient * basePeakHeight),
      1
    );
    ctx.fillRect(
      i * groupPixelWidth,
      height - scaledPeakHeight,
      groupPixelWidth - 1,
      scaledPeakHeight
    );
  }
}

/**
 * @param {{ onRecordFinish: RecordingCallback }} props
 */
function SampleRecord({ onRecordFinish }) {
  /**
   * @type {React.RefObject<HTMLCanvasElement>}
   */
  const recordButtonCanvasRef = useRef(null);

  const groupSizeRef = useRef(0);
  const peaksRef = useRef(new Float32Array());
  const peakOffsetRef = useRef(0);
  // each item in the queue is an array of channel chunks,
  // each channel chunk being a Float32Array
  const updatesQueueRef = useRef(/** @type {Float32Array[][]} */ ([]));

  /**
   * @type {(channels: Float32Array[]) => Promise<void>}
   */
  const onRecordUpdate = useCallback(async (channels) => {
    const groupSize = groupSizeRef.current;
    const peaks = peaksRef.current;
    const updatesQueue = updatesQueueRef.current;

    updatesQueue.push(channels);

    const queuedSampleCount = updatesQueue.reduce(
      (c, [{ length }]) => c + length,
      0
    );
    if (queuedSampleCount >= groupSize) {
      const samplesByChannel = await Promise.all(
        channels
          .map((_, ch) =>
            updatesQueue.reduce((chunks, update) => [...chunks, update[ch]], [])
          )
          .map(async (chunks) => {
            const arrayBuffer = await new Blob(chunks).arrayBuffer();
            return new Float32Array(arrayBuffer);
          })
      );
      const peaksByChannel = samplesByChannel.map((samples) =>
        findSamplePeak(new Float32Array(samples.buffer, 0, groupSize))
      );
      peaks[peakOffsetRef.current] = Math.max(...peaksByChannel);
      drawRecordingPeaks({
        canvas: /** @type {HTMLCanvasElement} */ (
          recordButtonCanvasRef.current
        ),
        peaks,
        peakOffset: peakOffsetRef.current,
        scaleCoefficient: 0.3,
      });
      peakOffsetRef.current++;
      updatesQueueRef.current = [
        samplesByChannel.map((samples) => samples.slice(groupSize)),
      ];
    }
  }, []);

  const {
    captureDevices,
    accessState,
    selectedCaptureDeviceId,
    selectedChannelCount,
    captureState,
    recordingError,
    maxSamples,
    refreshCaptureDevices,
    setSelectedCaptureDeviceId,
    setSelectedChannelCount,
    beginRecording,
    stopRecording,
  } = useMediaRecording(onRecordUpdate, onRecordFinish);

  useEffect(() => {
    const canvas = recordButtonCanvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
  }, [accessState]);

  // set up empty recording waveform data when recording starts
  useLayoutEffect(() => {
    const canvas = recordButtonCanvasRef.current;
    if (!canvas) {
      return;
    }
    if (captureState !== 'finalizing') {
      /** @type {CanvasRenderingContext2D} */ (
        canvas.getContext('2d')
      ).clearRect(0, 0, canvas.width, canvas.height);
    }
    if (captureState === 'capturing' && maxSamples) {
      groupSizeRef.current = Math.floor(
        (groupPixelWidth * maxSamples) / recordButtonCanvasRef.current.width
      );
      peaksRef.current = new Float32Array(
        Math.floor(maxSamples / groupSizeRef.current)
      );
      peakOffsetRef.current = 0;
      updatesQueueRef.current = [];
    }
  }, [maxSamples, captureState]);

  const [showingCaptureConfig, setShowingCaptureConfig] = useState(false);

  return (
    <div>
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
            className={classes.recordButton}
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
            <canvas ref={recordButtonCanvasRef} />
            <span>
              {['capturing', 'finalizing'].includes(captureState)
                ? 'Finished recording'
                : 'Start recording'}
            </span>
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
    </div>
  );
}

export default SampleRecord;

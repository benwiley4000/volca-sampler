import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Form,
  Button,
  Alert,
  Container,
  Nav,
  Accordion,
} from 'react-bootstrap';

import {
  findSamplePeak,
  getAudioBufferForAudioFileData,
} from './utils/audioData.js';
import { captureAudio, getAudioInputDevices } from './utils/recording.js';

import classes from './SampleRecord.module.scss';

const captureDevicePreferenceKey = 'capture_device_preference';

/**
 * @typedef {{
 *   deviceId: string;
 *   channelCount: number;
 *   label?: string;
 * }} CaptureDevicePreference
 */

/**
 * @type {Map<string, import('./utils/recording').AudioDeviceInfoContainer> | null}
 */
let cachedCaptureDevices = null;

/**
 * @typedef {(audioFileBuffer: Uint8Array, userFile?: File) => Promise<'saved' | 'silent'>} RecordingCallback
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
  // just for displaying stuff in the UI while the selection is validating
  const [captureDeviceFromStorage] = useState(restoringCaptureDevice.current);
  const [captureDevices, setCaptureDevices] = useState(cachedCaptureDevices);
  const [accessState, setAccessState] = useState(
    /** @type {'pending' | 'ok' | 'denied' | 'unavailable'} */ (
      captureDevices ? 'ok' : 'pending'
    )
  );
  const [selectedCaptureDevice, setSelectedCaptureDevice] = useState(
    /** @type {import('./utils/recording').AudioDeviceInfoContainer | null} */ (
      null
    )
  );
  const selectedCaptureDeviceId = useMemo(
    () => (selectedCaptureDevice ? selectedCaptureDevice.device.deviceId : ''),
    [selectedCaptureDevice]
  );
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
          setSelectedCaptureDevice((device) => {
            if (device) {
              restoringCaptureDevice.current = null;
              return device;
            }
            if (restoringCaptureDevice.current) {
              const deviceMatch = devices.find(
                ({ device }) =>
                  /** @type {NonNullable<CaptureDevicePreference>} */ (
                    restoringCaptureDevice.current
                  ).deviceId === device.deviceId
              );
              if (deviceMatch) {
                return deviceMatch;
              }
            }
            restoringCaptureDevice.current = null;
            return devices[0];
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
    if (selectedCaptureDevice) {
      localStorage.setItem(
        captureDevicePreferenceKey,
        JSON.stringify({
          deviceId: selectedCaptureDevice.device.deviceId,
          channelCount: selectedChannelCount,
          label: selectedCaptureDevice.device.label,
        })
      );
    }
  }, [selectedCaptureDevice, selectedChannelCount]);
  /**
   * @typedef {'ready' | 'capturing' | 'finalizing' | 'error'} CaptureState
   */
  const [captureState, setCaptureState] = useState(
    /** @type {CaptureState} */ ('ready')
  );
  const [recordingError, setRecordingError] = useState(
    /** @type {unknown} */ (null)
  );
  const [showSilenceWarning, setShowSilenceWarning] = useState(false);
  useEffect(() => {
    if (captureState !== 'ready') {
      setShowSilenceWarning(false);
    }
  }, [captureState]);
  const dismissSilenceWarning = useCallback(() => {
    setShowSilenceWarning(false);
  }, []);
  // to be set when recording is started
  const [stop, setStop] = useState({
    /**
     * @param {boolean} [cancel]
     */
    fn(cancel) {},
  });
  useEffect(() => {
    return stop.fn;
  }, [stop]);
  const [sampleRate, setSampleRate] = useState(Infinity);
  const [maxSamples, setMaxSamples] = useState(0);
  const handleBeginRecording = useCallback(async () => {
    let cancelled = false;
    /**
     * @param {string} deviceId
     * @param {number} channelCount
     */
    const record = (deviceId, channelCount) =>
      captureAudio({
        deviceId,
        channelCount,
        onStart: (sampleRate, timeLimitSeconds) => {
          const maxSamples = timeLimitSeconds * sampleRate;
          setSampleRate(sampleRate);
          setMaxSamples(maxSamples);
          setCaptureState('capturing');
        },
        onUpdate: onRecordUpdate,
      });
    // if we haven't opened our device settings to get device info yet, let's
    // still try to record with our last-used device
    const tentativeDevice = restoringCaptureDevice.current;
    const { mediaRecording, stop } = await (tentativeDevice
      ? (async () => {
          try {
            return record(
              tentativeDevice.deviceId,
              tentativeDevice.channelCount
            );
          } catch (err) {
            // ignore the NotFound exception if we hadn't refreshed our devices
            // yet, just try the default instead
            if (err instanceof DOMException && err.name === 'NotFoundError') {
              return record(selectedCaptureDeviceId, selectedChannelCount);
            }
            throw err;
          }
        })()
      : record(selectedCaptureDeviceId, selectedChannelCount));
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
      const result = await onRecordFinish(wavBuffer);
      if (!cancelled) {
        setCaptureState('ready');
        if (result === 'silent') {
          setShowSilenceWarning(true);
        }
      }
    }
  }, [
    selectedCaptureDeviceId,
    selectedChannelCount,
    onRecordUpdate,
    onRecordFinish,
  ]);
  /** @type {React.ChangeEventHandler<HTMLInputElement>} */
  const importFile = useCallback(
    (e) => {
      if (e.target.files && e.target.files.length) {
        const file = e.target.files[0];
        file.arrayBuffer().then(async (arrayBuffer) => {
          const audioFileBuffer = new Uint8Array(arrayBuffer);
          /**
           * @type {AudioBuffer}
           */
          let audioBuffer;
          try {
            audioBuffer = await getAudioBufferForAudioFileData(audioFileBuffer);
          } catch (err) {
            alert('Unsupported audio format detected');
            return;
          }
          if (audioBuffer.length > 10 * audioBuffer.sampleRate) {
            alert('Please select an audio file no more than 10 seconds long');
            return;
          }
          setCaptureState('finalizing');
          const result = await onRecordFinish(audioFileBuffer, file);
          setCaptureState('ready');
          if (result === 'silent') {
            setShowSilenceWarning(true);
          }
        });
      }
    },
    [onRecordFinish]
  );
  return {
    captureDevices,
    accessState,
    selectedCaptureDevice,
    selectedChannelCount,
    captureDeviceFromStorage,
    captureState,
    recordingError,
    showSilenceWarning,
    sampleRate,
    maxSamples,
    refreshCaptureDevices,
    setSelectedCaptureDevice,
    setSelectedChannelCount,
    beginRecording: handleBeginRecording,
    stopRecording: stop.fn,
    importFile,
    dismissSilenceWarning,
  };
}

const groupPixelWidth = 3;

/**
 * @param {{
 *   canvas: HTMLCanvasElement;
 *   peaks: Float32Array;
 *   drawUntil: number;
 *   scaleCoefficient: number;
 * }} opts
 */
function drawRecordingPeaks({ canvas, peaks, drawUntil, scaleCoefficient }) {
  const barColor = '#fff';
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  ctx.imageSmoothingEnabled = false;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = barColor;
  for (let i = 0; i < drawUntil && i < peaks.length; i++) {
    const peak = peaks[i];
    const basePeakHeight = height * peak; // float
    // make the bar always at least 1px tall to avoid empty sections
    const scaledPeakHeight = Math.max(
      Math.round(scaleCoefficient * basePeakHeight),
      2
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
  const sampleRateRef = useRef(Infinity);
  const samplesRecordedRef = useRef(0);

  const [secondsRecorded, setSecondsRecorded] = useState(0);

  /**
   * @type {(channels: Float32Array[]) => Promise<void>}
   */
  const onRecordUpdate = useCallback(async (channels) => {
    const groupSize = groupSizeRef.current;
    const peaks = peaksRef.current;
    const updatesQueue = updatesQueueRef.current;

    updatesQueue.push(channels);
    samplesRecordedRef.current += channels[0].length;
    setSecondsRecorded(
      Math.floor(samplesRecordedRef.current / sampleRateRef.current)
    );

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
      peaks[peakOffsetRef.current++] = Math.max(...peaksByChannel);
      drawRecordingPeaks({
        canvas: /** @type {HTMLCanvasElement} */ (
          recordButtonCanvasRef.current
        ),
        peaks,
        drawUntil: peakOffsetRef.current,
        scaleCoefficient: 0.3,
      });
      updatesQueueRef.current = [
        samplesByChannel.map((samples) => samples.slice(groupSize)),
      ];
    }
  }, []);

  const {
    captureDevices,
    accessState,
    selectedCaptureDevice,
    selectedChannelCount,
    captureDeviceFromStorage,
    captureState,
    recordingError,
    showSilenceWarning,
    maxSamples,
    sampleRate,
    refreshCaptureDevices,
    setSelectedCaptureDevice,
    setSelectedChannelCount,
    beginRecording,
    stopRecording,
    importFile,
    dismissSilenceWarning,
  } = useMediaRecording(onRecordUpdate, onRecordFinish);
  sampleRateRef.current = sampleRate;

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
      sampleRateRef.current = Infinity;
      samplesRecordedRef.current = 0;
      setSecondsRecorded(0);
    }
  }, [maxSamples, captureState]);

  const [showingCaptureConfig, setShowingCaptureConfig] = useState(false);

  useEffect(() => {
    if (showingCaptureConfig) {
      refreshCaptureDevices();
    }
  }, [showingCaptureConfig, refreshCaptureDevices]);

  const displayedChannelCount = selectedCaptureDevice
    ? selectedChannelCount
    : captureDeviceFromStorage
    ? captureDeviceFromStorage.channelCount
    : selectedChannelCount;

  return (
    <Container fluid="sm" className={classes.container}>
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
        <>
          <h2>Send a new sound to your volca sample!</h2>
          {showSilenceWarning && (
            <div className={classes.alertContainer}>
              <Alert
                dismissible
                variant="warning"
                onClose={dismissSilenceWarning}
              >
                <Alert.Heading>
                  Your recording was totally silent.
                </Alert.Heading>
                <p>
                  Check the <strong>Audio input settings</strong> and your
                  connections, then try again.
                </p>
              </Alert>
            </div>
          )}
          <Button
            id="record-button"
            className={classes.recordButton}
            type="button"
            variant="primary"
            size="lg"
            onClick={
              captureState === 'capturing'
                ? () => stopRecording()
                : beginRecording
            }
            disabled={captureState === 'finalizing'}
          >
            <canvas ref={recordButtonCanvasRef} />
            <span className={classes.mainText}>
              {['capturing', 'finalizing'].includes(captureState)
                ? 'Finished recording'
                : 'Start recording'}
            </span>
            {['capturing', 'finalizing'].includes(captureState) && (
              <span className={classes.timeRecorded}>
                0:{String(secondsRecorded).padStart(2, '0')}
              </span>
            )}
          </Button>
          {['capturing', 'finalizing'].includes(captureState) ? (
            <>
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => stopRecording(true)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Accordion
              activeKey={showingCaptureConfig ? 'audioInput' : 'nothing'}
            >
              <Accordion.Item eventKey="audioInput">
                <Accordion.Header
                  className={classes.audioInputHeader}
                  onClick={() => setShowingCaptureConfig((showing) => !showing)}
                >
                  <div>
                    <span>Audio input settings</span>
                    {(selectedCaptureDevice || captureDeviceFromStorage) && (
                      <>
                        <p className="small">
                          <strong>Capture device:</strong>{' '}
                          {selectedCaptureDevice
                            ? selectedCaptureDevice.device.label ||
                              selectedCaptureDevice.device.deviceId
                            : captureDeviceFromStorage
                            ? captureDeviceFromStorage.label
                            : ''}
                        </p>
                        <p className="small">
                          <strong>Input channels:</strong>{' '}
                          {displayedChannelCount === 1 ? 'Mono' : 'Stereo'}
                        </p>
                      </>
                    )}
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <Form.Group>
                    <Form.Label>Capture device</Form.Label>
                    <Form.Select
                      value={
                        selectedCaptureDevice
                          ? selectedCaptureDevice.device.deviceId
                          : captureDeviceFromStorage
                          ? captureDeviceFromStorage.deviceId
                          : ''
                      }
                      onChange={(e) =>
                        captureDevices &&
                        accessState === 'ok' &&
                        setSelectedCaptureDevice(
                          captureDevices.get(e.target.value) || null
                        )
                      }
                    >
                      {captureDevices && accessState === 'ok' ? (
                        [...captureDevices].map(([id, { device }]) => (
                          <option key={id} value={id}>
                            {device.label || id}
                          </option>
                        ))
                      ) : captureDeviceFromStorage ? (
                        <option
                          value={captureDeviceFromStorage.deviceId}
                          disabled
                        >
                          {captureDeviceFromStorage.label ||
                            captureDeviceFromStorage.deviceId}
                        </option>
                      ) : (
                        <option value="" disabled>
                          Loading devices...
                        </option>
                      )}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Input channels</Form.Label>
                    <Nav
                      variant="pills"
                      activeKey={displayedChannelCount}
                      onSelect={(count) =>
                        setSelectedChannelCount(Number(count))
                      }
                    >
                      {[1, 2].map((count) => (
                        <Nav.Item key={count}>
                          <Nav.Link
                            as="button"
                            className={classes.channelOption}
                            eventKey={count}
                            disabled={
                              displayedChannelCount !== count &&
                              (selectedCaptureDevice
                                ? selectedCaptureDevice.channelsAvailable
                                : 1) < count
                            }
                          >
                            {count === 1 ? 'Mono' : 'Stereo'}
                          </Nav.Link>
                        </Nav.Item>
                      ))}
                    </Nav>
                  </Form.Group>
                  <p className={['small', classes.stereoExplanation].join(' ')}>
                    Stereo input is summed to mono.
                  </p>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}
        </>
      )}
      {(captureState === 'error' && recordingError) || null}
      {!['capturing', 'finalizing'].includes(captureState) && (
        <Button
          className={classes.importFileButton}
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
            onChange={importFile}
          />
        </Button>
      )}
    </Container>
  );
}

export default SampleRecord;

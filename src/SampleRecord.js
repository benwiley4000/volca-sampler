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
  Accordion,
  Modal,
  Tab,
  Tabs,
  ButtonGroup,
  ToggleButton,
} from 'react-bootstrap';

import {
  findSamplePeak,
  getAudioBufferForAudioFileData,
} from './utils/audioData.js';
import { captureAudio, getAudioInputDevices } from './utils/recording.js';

import classes from './SampleRecord.module.scss';

/**
 * @type {'windows' | 'mac' | 'linux' | 'ios' | 'android'}
 */
const userOS = (() => {
  const userAgentString = navigator.userAgent.toLowerCase();
  if (
    userAgentString.includes('iphone') ||
    userAgentString.includes('ipad') ||
    (userAgentString.includes('mac') && navigator.maxTouchPoints > 1)
  ) {
    return 'ios';
  }
  if (userAgentString.includes('android')) {
    return 'android';
  }
  if (userAgentString.includes('mac')) {
    return 'mac';
  }
  if (userAgentString.includes('linux')) {
    return 'linux';
  }
  return 'windows';
})();

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
  const [recordingError, setRecordingError] = useState('');
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
      setRecordingError(String(err));
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

  const [showingSystemRecordDialog, setShowingSystemRecordDialog] =
    useState(false);

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
          {(captureState === 'error' && recordingError && (
            <p>Recording error: {recordingError}</p>
          )) ||
            null}
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
            <>
              <Accordion
                activeKey={showingCaptureConfig ? 'audioInput' : 'nothing'}
              >
                <Accordion.Item eventKey="audioInput">
                  <Accordion.Header
                    className={classes.audioInputHeader}
                    onClick={() =>
                      setShowingCaptureConfig((showing) => !showing)
                    }
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
                      <ButtonGroup className={classes.channelOptionSelect}>
                        {[1, 2].map((count) => (
                          <ToggleButton
                            key={count}
                            className={classes.channelOption}
                            type="radio"
                            variant="outline-secondary"
                            name="channels"
                            value={count}
                            checked={count === displayedChannelCount}
                            disabled={
                              displayedChannelCount !== count &&
                              (selectedCaptureDevice
                                ? selectedCaptureDevice.channelsAvailable
                                : 1) < count
                            }
                            onClick={() =>
                              setSelectedChannelCount(Number(count))
                            }
                          >
                            {count === 1 ? 'Mono' : 'Stereo'}
                          </ToggleButton>
                        ))}
                      </ButtonGroup>
                    </Form.Group>
                    <p
                      className={['small', classes.stereoExplanation].join(' ')}
                    >
                      Stereo input is summed to mono.
                    </p>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
              <Button
                variant="link"
                onClick={() => setShowingSystemRecordDialog(true)}
              >
                Want to record your device's audio output?
              </Button>
            </>
          )}
        </>
      )}
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
            accept="audio/*,video/*,.wav,.mp3,.ogg"
            onChange={importFile}
          />
        </Button>
      )}
      <Modal
        show={showingSystemRecordDialog}
        aria-labelledby="system-record-modal"
        onHide={() => setShowingSystemRecordDialog(false)}
      >
        <Modal.Header>
          <Modal.Title id="system-record-modal">
            Recording audio playing on your device
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          onClick={
            /** @type {React.MouseEventHandler<HTMLElement>} */
            (e) => {
              if (e.target instanceof HTMLImageElement) {
                window.open(e.target.src, '_blank', 'noreferrer');
              }
            }
          }
          className={classes.systemRecordModalBody}
        >
          <Tabs defaultActiveKey={userOS} className={classes.osTabs}>
            <Tab eventKey="windows" title="Windows">
              <p>
                Windows has a built-in capture device called{' '}
                <strong>Stereo Mix</strong> for recording system audio, but it
                needs to be enabled.{' '}
                <a
                  href="https://allthings.how/how-to-enable-missing-stereo-mix-option-in-windows-10/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Follow this tutorial
                </a>{' '}
                to enable it.
              </p>
              <p>
                Once the <strong>Stereo Mix</strong> capture device has been
                enabled, you can select it from Volca Sampler's{' '}
                <strong>Audio input settings</strong>.
              </p>
            </Tab>
            <Tab eventKey="mac" title="Mac">
              <p>
                The easiest way to capture system audio on macOS is to install a
                free app called{' '}
                <a
                  href="https://github.com/kyleneideck/BackgroundMusic/blob/master/README.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Background Music
                </a>
                . Make sure you download the{' '}
                <a
                  href="https://github.com/kyleneideck/BackgroundMusic/releases/tag/0.4.0-SNAPSHOT-b38f6dd"
                  target="_blank"
                  rel="noreferrer"
                >
                  4.0.0-SNAPSHOT
                </a>{' '}
                version, since earlier versions don't work well with Volca
                Sampler.
              </p>
              <p>
                Once Background Music has been installed, you can select the{' '}
                <strong>Background Music (Virtual)</strong> capture device from
                Volca Sampler's <strong>Audio input settings</strong>.
              </p>
            </Tab>
            <Tab eventKey="linux" title="Linux">
              <p>
                Assuming you have PulseAudio installed on your Linux system, you
                can run the following command to create a capture device called{' '}
                <strong>System_Output</strong>:
              </p>
              <pre>
                <code>
                  {`pactl \\
  load-module module-remap-source \\
  master="$( \\
    pactl list \\
    | grep -A2 '^Source #' \\
    | grep 'Name: .*\\.monitor$' \\
    | awk '{print $NF}' \\
    | tail -n1 \\
  )" \\
  source_name=systemout_monitor \\
  source_properties=device.description=System_Output`}
                </code>
              </pre>
              <p>
                Once the <strong>System_Output</strong> capture device has been
                created, you can select it from Volca Sampler's{' '}
                <strong>Audio input settings</strong>.
              </p>
              <p>
                Note that the capture device will <i>not</i> persist after
                reboot, so if you want it to always be available, you'll need to
                add the above command into a bash profile file like{' '}
                <code>~/.bashrc</code>.
              </p>
            </Tab>
            <Tab eventKey="ios" title="iOS">
              <p>
                You can't record directly into Volca Sampler with iOS. Instead,
                you can capture a recording to be imported as a file. The
                instructions below show you how to record a screencapture video
                with iOS, convert it to the appropriate audio format, and import
                it.
              </p>
              <h4>Enable Screen Recording</h4>
              <p>
                First you'll need to go into <strong>Settings</strong>, choose{' '}
                <strong>Control Panel</strong> in the left-side menu, and tap
                the <strong>"+"</strong> button next to{' '}
                <strong>Screen Recording</strong>, which can be found under the{' '}
                <strong>More Controls</strong> list. If{' '}
                <strong>Screen Recording</strong> is already listed under{' '}
                <strong>Included Controls</strong>, you can skip this step.
              </p>
              <img src="ios_enable_screen_recording.png" alt="" />
              <h4>Capture recording</h4>
              <p>
                Next, once you are ready to record, swipe down from the{' '}
                <strong>top-right</strong> and tap the{' '}
                <strong>Screen Recording</strong> button which will now appear
                in the <strong>Control Panel</strong> menu.
              </p>
              <img src="ios_record_start.png" alt="" />
              <p>
                Once the recording has started, you'll see a small recording
                status button at the top of the screen. Tap this button when
                you've finished recording.
              </p>
              <img src="ios_stop_recording.png" alt="" />
              <p>
                After finishing recording, tap the notification appearing at the
                top of the screen, which will take you to the{' '}
                <strong>Photos</strong> app to review your recording.
              </p>
              <img src="ios_go_to_saved_file.png" alt="" />
              <h4>Trim recording</h4>
              <p>
                If your recorded video is longer than 10 seconds, you will need
                to trim it so it will be accepted by Volca Sampler's file
                import. Tap the <strong>Edit</strong> button...
              </p>
              <img src="ios_edit_video_select.png" alt="" />
              <p>
                ...and adjust as needed, tapping <strong>Done</strong> to
                finish.
              </p>
              <img src="ios_edit_recording.png" alt="" />
              <h4>Convert to WAV</h4>
              <p>
                You're almost done. Your video is likely saved in{' '}
                <strong>AIFF</strong> format, which is not supported by Volca
                Sampler. One of the best free iOS apps for converting AIFF video
                to <strong>WAV</strong> audio is{' '}
                <a
                  href="https://apps.apple.com/ca/app/audio-converter-extract-mp3/id1393886341"
                  target="_blank"
                  rel="noreferrer"
                >
                  Audio Converter
                </a>
                . Don't confuse this with with "The Audio Converter", which
                requires payment to convert to WAV.
              </p>
              <p>
                After installing and launching <strong>Audio Converter</strong>,
                tap the <strong>"+"</strong> button to the right and select{' '}
                <strong>Import videos</strong> to import your recording from
                your <strong>Photos</strong> library.
              </p>
              <img src="ios_import_video.png" alt="" />
              <p>
                Tap the imported video and select <strong>Extract Audio</strong>
                .
              </p>
              <img src="ios_extract_audio_select.png" alt="" />
              <p>
                The only setting that needs to be configured is the{' '}
                <strong>Format</strong>, which should be <strong>wav</strong>.
                When this is selected, tap <strong>Start Conversion</strong>.
              </p>
              <img src="ios_convert_to_wav.png" alt="" />
              <h4>Import to Volca Sampler</h4>
              <p>
                Once the conversion to WAV has completed, you can choose your
                file for import in Volca Sampler.
              </p>
            </Tab>
            <Tab eventKey="android" title="Android">
              <p>
                You can't record directly into Volca Sampler with Android.
                Instead, you can capture a recording to be imported as a file.
                The instructions below show you how to record a screencapture
                video with Android, convert it to a trimmed WAV file, and import
                it.
              </p>
              <p>
                <strong>Note:</strong> Some apps won't allow you to record their
                audio. Google Chrome and Spotify, for example, block audio
                capture. The way to find out if an app allows audio capture is
                to listen to recorded files and see whether the audio is muted.
              </p>
              <h4>Enable Screen record</h4>
              <p>
                First you'll need to swipe down from the top of the screen two
                times to see the list of <strong>Action Tiles</strong> and tap
                the <strong>Pencil</strong> icon shown at the bottom-left of the
                overlay, which will open the <strong>Edit Tiles</strong> screen.
              </p>
              <img src="android_edit_tiles.png" alt="" />
              <p>
                Grab the <strong>Screen record</strong> tile and drag it up into
                the list of active tiles. If <strong>Screen record</strong> is
                already active, you can skip this step.
              </p>
              <img src="android_enable_screen_recording.png" alt="" />
              <h4>Capture recording</h4>
              <p>
                Tap the back button to return to the screen of{' '}
                <strong>Action Tiles</strong>, which should now include{' '}
                <strong>Screen record</strong>. Tap{' '}
                <strong>Screen record</strong>.
              </p>
              <img src="android_selection_screen_recording.png" alt="" />
              <p>
                Before recording, change the audio source from{' '}
                <strong>Microphone</strong> to <strong>Device audio</strong>.
                Tap <strong>Start</strong>.
              </p>
              <img src="android_start_recording.png" alt="" />
              <p>
                Make sure to wait for the countdown at the top of the screen
                before starting to play your audio.
              </p>
              <img src="android_wait_for_recording.png" alt="" />
              <p>
                To finish recording, swipe down from the top of the screen and
                tap the recording notification.
              </p>
              <img src="android_stop_recording.png" alt="" />
              <h4>Trim and convert to WAV</h4>
              <p>
                You're almost done. Your video is likely saved in{' '}
                <strong>MP4</strong> format, which can be imported directly to
                Volca Sampler.
              </p>
              <p>
                However, if your video is longer than 10 seconds, you will need
                to trim it, and you might prefer to import the file in{' '}
                <strong>WAV</strong> format. One of the best free Android apps
                for converting MP4 video to WAV audio, and trimming it at the
                same time, is{' '}
                <a
                  href="https://play.google.com/store/apps/details?id=com.psma.audioextractor"
                  target="_blank"
                  rel="noreferrer"
                >
                  Audio Extractor
                </a>
                .
              </p>
              <img src="android_extract_audio.png" alt="" />
              <h4>Import to Volca Sampler</h4>
              <p>
                Once your recording has been trimmed and converted as needed,
                you can choose your file for import in Volca Sampler.
              </p>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowingSystemRecordDialog(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default SampleRecord;

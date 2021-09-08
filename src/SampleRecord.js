import React, { useCallback, useEffect, useState } from 'react';

import { captureAudio, getAudioInputDevices } from './utils';

/**
 * @typedef {{
 *   onRecordStart: () => void;
 *   onRecordFinish: (wavBuffer: Uint8Array) => void;
 *   onRecordError: (err: unknown) => void;
 * }} MediaRecordingCallbacks
 */

/**
 * @param {MediaRecordingCallbacks} callbacks
 */
function useMediaRecording({ onRecordStart, onRecordFinish, onRecordError }) {
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
  useEffect(() => {
    if (recordingError) {
      onRecordError(recordingError);
    }
  }, [recordingError, onRecordError]);
  // to be set when recording is started
  const [stop, setStop] = useState({ fn: () => {} });
  const handleBeginRecording = useCallback(async () => {
    const { mediaRecording, stop } = await captureAudio({
      deviceId: selectedCaptureDeviceId,
      channelCount: selectedChannelCount,
      onStart: onRecordStart,
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
    onRecordFinish(wavBuffer);
  }, [
    selectedCaptureDeviceId,
    selectedChannelCount,
    onRecordStart,
    onRecordFinish,
  ]);
  return {
    captureDevices,
    selectedCaptureDeviceId,
    selectedChannelCount,
    recordingError,
    setSelectedCaptureDeviceId,
    setSelectedChannelCount,
    beginRecording: handleBeginRecording,
    stopRecording: stop.fn,
  };
}

/**
 * @typedef {'ready' | 'capturing' | 'preparing' | 'error' | 'idle'} CaptureState
 */

/**
 * @param {{ captureState: CaptureState } & MediaRecordingCallbacks} props
 */
function SampleRecord({ captureState, ...callbacks }) {
  const {
    captureDevices,
    selectedCaptureDeviceId,
    selectedChannelCount,
    recordingError,
    setSelectedCaptureDeviceId,
    setSelectedChannelCount,
    beginRecording,
    stopRecording,
  } = useMediaRecording(callbacks);

  if (captureState === 'idle') {
    return null;
  }

  return (
    <div style={{ paddingLeft: '2rem' }}>
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
        onClick={captureState === 'capturing' ? stopRecording : beginRecording}
        disabled={captureState === 'preparing'}
      >
        {['capturing', 'preparing'].includes(captureState) ? 'Stop' : 'Record'}
      </button>
    </div>
  );
}

export default SampleRecord;

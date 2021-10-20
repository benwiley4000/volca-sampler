import React, { useCallback, useEffect, useState } from 'react';

import { getAudioBufferForAudioFileData } from './utils/audioData.js';
import { captureAudio, getAudioInputDevices } from './utils/recording.js';

/**
 * @type {Map<string, import('./utils/recording').AudioDeviceInfoContainer> | null}
 */
let cachedCaptureDevices = null;

/**
 * @typedef {{
 *   onRecordStart: () => void;
 *   onRecordFinish: (audioFileBuffer: Uint8Array, userFile?: File) => void;
 *   onRecordError: (err: unknown) => void;
 * }} MediaRecordingCallbacks
 */

/**
 * @param {MediaRecordingCallbacks} callbacks
 */
function useMediaRecording({ onRecordStart, onRecordFinish, onRecordError }) {
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
    getAudioInputDevices()
      .then((devices) => {
        if (devices.length) {
          setCaptureDevices(
            new Map(devices.map((d) => [d.device.deviceId, d]))
          );
          setSelectedCaptureDeviceId((id) => id || devices[0].device.deviceId);
        }
      })
      .catch((err) => {
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
  }, []);
  useEffect(refreshCaptureDevices, [refreshCaptureDevices]);
  const [selectedChannelCount, setSelectedChannelCount] = useState(1);
  useEffect(() => {
    const selectedDeviceInfo =
      captureDevices && captureDevices.get(selectedCaptureDeviceId);
    if (selectedDeviceInfo) {
      setSelectedChannelCount(selectedDeviceInfo.channelsAvailable);
    }
  }, [captureDevices, selectedCaptureDeviceId]);
  const [recordingError, setRecordingError] = useState(
    /** @type {unknown} */ (null)
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
    accessState,
    selectedCaptureDeviceId,
    selectedChannelCount,
    recordingError,
    refreshCaptureDevices,
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
    accessState,
    selectedCaptureDeviceId,
    selectedChannelCount,
    recordingError,
    refreshCaptureDevices,
    setSelectedCaptureDeviceId,
    setSelectedChannelCount,
    beginRecording,
    stopRecording,
  } = useMediaRecording(callbacks);

  return (
    <div style={{ paddingLeft: '2rem' }}>
      {accessState === 'denied' ? (
        <p>
          Looks like you didn't grant access to your audio input device. Please
          give Volca Sampler access, then{' '}
          <button type="button" onClick={refreshCaptureDevices}>
            try again
          </button>
        </p>
      ) : accessState === 'unavailable' ? (
        <p>
          Volca Sampler couldn't find any audio input devices. Please connect
          one, then{' '}
          <button type="button" onClick={refreshCaptureDevices}>
            try again
          </button>
        </p>
      ) : (
        <div>
          <label>
            Capture Device
            <select
              value={selectedCaptureDeviceId}
              onChange={(e) => setSelectedCaptureDeviceId(e.target.value)}
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
            </select>
          </label>
          <label>
            Channel count
            <select
              value={selectedChannelCount}
              onChange={(e) => setSelectedChannelCount(Number(e.target.value))}
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
                  {count}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <button
        type="button"
        onClick={captureState === 'capturing' ? stopRecording : beginRecording}
        disabled={captureState === 'preparing'}
      >
        {['capturing', 'preparing'].includes(captureState) ? 'Stop' : 'Record'}
      </button>
      <input
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
              callbacks.onRecordFinish(audioFileBuffer, file);
            });
          }
        }}
      />
      {(captureState === 'error' && recordingError) || null}
    </div>
  );
}

export default SampleRecord;

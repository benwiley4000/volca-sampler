import React, { useCallback, useEffect, useState } from 'react';
import { styled } from 'tonami';

import { getAudioBufferForAudioFileData } from './utils/audioData.js';
import { captureAudio, getAudioInputDevices } from './utils/recording.js';

const SampleRecordDiv = styled.div({
  padding: '2rem',
});

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
          setSelectedCaptureDeviceId((id) => id || devices[0].device.deviceId);
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
      setSelectedChannelCount(selectedDeviceInfo.channelsAvailable);
    }
  }, [captureDevices, selectedCaptureDeviceId]);
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
  const [stop, setStop] = useState({ fn: () => {} });
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
      setCaptureState('error');
      return;
    }
    setCaptureState('finalizing');
    onRecordFinish(wavBuffer);
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

  return (
    <SampleRecordDiv>
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
        disabled={captureState === 'finalizing'}
      >
        {['capturing', 'finalizing'].includes(captureState) ? 'Stop' : 'Record'}
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
              onRecordFinish(audioFileBuffer, file);
            });
          }
        }}
      />
      {(captureState === 'error' && recordingError) || null}
    </SampleRecordDiv>
  );
}

export default SampleRecord;

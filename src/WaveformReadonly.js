import React, { useEffect, useMemo } from 'react';
import {
  findSamplePeak,
  getTrimmedView,
  useTargetAudioForSample,
} from './utils/audioData.js';

import {
  useLoadedSample,
  useWaveformInfo,
  useWaveformPlayback,
} from './utils/waveform.js';
import WaveformDisplay from './WaveformDisplay.js';
import WaveformPlayback from './WaveformPlayback.js';

import classes from './WaveformReadonly.module.scss';

/**
 * @typedef {{
 *   sample: import('./store').SampleContainer;
 * }} WaveformReadonlyProps
 */

/**
 * @param {WaveformReadonlyProps} props
 */
function WaveformReadonly({ sample: _sample }) {
  const { wav: previewWavFile, audioBuffer: previewAudioBuffer } =
    useTargetAudioForSample(_sample);
  const {
    sample: {
      metadata: {
        name,
        normalize,
        trim: { frames: trimFrames },
      },
    },
    sourceAudioBuffer,
  } = useLoadedSample(_sample);
  const { monoSamples, waveformRef, peaks, onResize } =
    useWaveformInfo(sourceAudioBuffer);

  const trimmedSamplePeak = useMemo(() => {
    if (!sourceAudioBuffer) {
      return 0;
    }
    const trimmedView = getTrimmedView(monoSamples, trimFrames);
    const samplePeak = findSamplePeak(trimmedView);
    return samplePeak;
  }, [sourceAudioBuffer, monoSamples, trimFrames]);

  const normalizationCoefficient = 1 / trimmedSamplePeak;

  const {
    isPlaybackActive,
    playbackProgress,
    displayedTime,
    togglePlayback,
    stopPlayback,
  } = useWaveformPlayback(previewAudioBuffer, true);

  useEffect(() => {
    return stopPlayback;
  }, [_sample, stopPlayback]);

  return (
    <div className={classes.waveformContainer}>
      <WaveformDisplay
        waveformRef={waveformRef}
        peaks={peaks}
        scaleCoefficient={normalize ? normalizationCoefficient : 1}
        onResize={onResize}
      />
      <WaveformPlayback
        isPlaybackActive={isPlaybackActive}
        playbackProgress={playbackProgress}
        displayedTime={displayedTime}
        downloadFilename={`${name}.volcasample.wav`}
        wavFile={previewWavFile}
        togglePlayback={togglePlayback}
      />
    </div>
  );
}

export default WaveformReadonly;

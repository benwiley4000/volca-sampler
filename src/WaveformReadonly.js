import React, { useEffect, useMemo } from 'react';
import { findSamplePeak, getTrimmedView } from './utils/audioData.js';

import {
  useLoadedSample,
  useWaveformInfo,
  useWaveformPlayback,
} from './utils/waveform.js';
import WaveformDisplay from './WaveformDisplay.js';
import WaveformPlayback from './WaveformPlayback.js';
import { usePreviewAudio } from './sampleCacheStore.js';

import classes from './WaveformReadonly.module.scss';

/**
 * @typedef {{
 *   sample: import('./store').SampleContainer;
 *   sampleCache: import('./sampleCacheStore.js').SampleCache | null;
 * }} WaveformReadonlyProps
 */

/**
 * @param {WaveformReadonlyProps} props
 */
function WaveformReadonly({ sample: _sample, sampleCache }) {
  const { wavData: previewWavFile, audioBuffer: previewAudioBuffer } =
    usePreviewAudio(sampleCache);
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
  } = useWaveformPlayback(previewAudioBuffer || null, true);

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
        wavFile={previewWavFile || null}
        togglePlayback={togglePlayback}
      />
    </div>
  );
}

export default WaveformReadonly;

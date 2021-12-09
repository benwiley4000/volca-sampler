import React, { useMemo } from 'react';
import { findSamplePeak, getTrimmedView } from './utils/audioData.js';

import { useLoadedSample, useWaveformInfo } from './utils/waveform.js';
import WaveformDisplay from './WaveformDisplay.js';

/**
 * @typedef {{
 *   sample: import('./store').SampleContainer;
 * }} WaveformReadonlyProps
 */

/**
 * @param {WaveformReadonlyProps} props
 */
function WaveformReadonly({ sample: _sample }) {
  const {
    sample: {
      metadata: { normalize, trim: { frames: trimFrames } },
    },
    sourceAudioBuffer,
  } = useLoadedSample(_sample);
  const { monoSamples, waveformRef, peaks } = useWaveformInfo(sourceAudioBuffer);

  const trimmedSamplePeak = useMemo(() => {
    if (!sourceAudioBuffer) {
      return 0;
    }
    const trimmedView = getTrimmedView(monoSamples, trimFrames);
    const samplePeak = findSamplePeak(trimmedView);
    return samplePeak;
  }, [sourceAudioBuffer, monoSamples, trimFrames]);

  const normalizationCoefficient = 1 / trimmedSamplePeak;

  return (
    <div style={{ backgroundColor: '#f3f3f3' }}>
      <WaveformDisplay
        waveformRef={waveformRef}
        peaks={peaks}
        scaleCoefficient={normalize ? normalizationCoefficient : 1}
      />
    </div>
  );
}

export default WaveformReadonly;

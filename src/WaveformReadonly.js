import React from 'react';

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
      metadata: { scaleCoefficient },
    },
    sourceAudioBuffer,
  } = useLoadedSample(_sample);
  const { waveformRef, peaks } = useWaveformInfo(sourceAudioBuffer);

  return (
    <div style={{ backgroundColor: '#f3f3f3' }}>
      <WaveformDisplay
        waveformRef={waveformRef}
        peaks={peaks}
        scaleCoefficient={scaleCoefficient}
      />
    </div>
  );
}

export default WaveformReadonly;

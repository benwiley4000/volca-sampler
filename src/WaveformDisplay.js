import React from 'react';
import { styled } from 'tonami';

import { GROUP_PIXEL_WIDTH } from './utils/waveform.js';

const WaveformDiv = styled.div({
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
});

const WaveformSection = styled.div({
  width: '100%',
  height: ({ $positive }) => ($positive ? '67%' : '33%'),
  display: 'flex',
  alignItems: ({ $positive }) => ($positive ? 'flex-end' : 'flex-start'),
});

const Scaled = styled.div({
  width: '100%',
  height: ({ $scaleCoefficient }) => `${100 * $scaleCoefficient}%`,
  willChange: 'height',
  display: 'flex',
  alignItems: ({ $positive }) => ($positive ? 'flex-end' : 'flex-start'),
});

const Bar = styled.div({
  width: `${GROUP_PIXEL_WIDTH}px`,
  height: ({ $amplitude, $positive }) =>
    `${100 * ($positive ? 1 : -1) * $amplitude}%`,
  paddingRight: '1px',
});

const BarInner = styled.div({
  backgroundColor: ({ $positive }) => ($positive ? 'red' : 'darkred'),
  height: '100%',
});

/**
 * @typedef {React.PropsWithChildren<{
 *   peaks: import('./utils/waveform').SamplePeaks;
 *   scaleCoefficient: number;
 *   waveformRef?: React.Ref<HTMLDivElement>;
 * }>} WaveformProps
 */

const WaveformDisplay = React.memo(
  /**
   * @param {WaveformProps} props
   */
  ({ peaks, scaleCoefficient, waveformRef, children }) => {
    return (
      <WaveformDiv ref={waveformRef}>
        {[true, false].map((positive) => {
          const key = positive ? 'positive' : 'negative';
          return (
            <WaveformSection key={key} $positive={positive}>
              <Scaled $scaleCoefficient={scaleCoefficient} $positive={positive}>
                {[].map.call(peaks[key], (amplitude, index) => (
                  <Bar key={index} $amplitude={amplitude} $positive={positive}>
                    <BarInner $positive={positive} />
                  </Bar>
                ))}
              </Scaled>
            </WaveformSection>
          );
        })}
        {children}
      </WaveformDiv>
    );
  }
);

export default WaveformDisplay;

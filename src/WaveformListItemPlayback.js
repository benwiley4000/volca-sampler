import React from 'react';

import classes from './WaveformPlayback.module.scss';

const WaveformListItemPlayback = React.memo(
  /**
   * @param {{
   *   isPlaybackActive: boolean;
   *   playbackProgress: number;
   * }} props
   */
  function WaveformPlayback({ isPlaybackActive, playbackProgress }) {
    return (
      <div
        className={[
          classes.playbackOverlay,
          isPlaybackActive ? classes.playbackActive : '',
        ].join(' ')}
        style={{
          // @ts-ignore
          '--playback-progress': `${100 * playbackProgress}%`,
        }}
      >
        <div className={classes.playback} />
      </div>
    );
  }
);

export default WaveformListItemPlayback;

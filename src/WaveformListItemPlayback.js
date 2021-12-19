import React from 'react';
import { Button } from 'react-bootstrap';
import { ReactComponent as PlayIcon } from '@material-design-icons/svg/filled/play_arrow.svg';
import { ReactComponent as StopIcon } from '@material-design-icons/svg/filled/stop.svg';

import classes from './WaveformPlayback.module.scss';

const WaveformListItemPlayback = React.memo(
  /**
   * @param {{
   *   isPlaybackActive: boolean;
   *   playbackProgress: number;
   *   togglePlayback: (e: MouseEvent | KeyboardEvent) => void;
   * }} props
   */
  function WaveformPlayback({
    isPlaybackActive,
    playbackProgress,
    togglePlayback,
  }) {
    return (
      <>
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
        <div
          className={[classes.playbackButtonContainer, classes.small].join(' ')}
        >
          <Button
            tabIndex={-1}
            variant="dark"
            onClick={(e) => togglePlayback(e.nativeEvent)}
          >
            {isPlaybackActive ? <StopIcon /> : <PlayIcon />}
          </Button>
        </div>
      </>
    );
  }
);

export default WaveformListItemPlayback;

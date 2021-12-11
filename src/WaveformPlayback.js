import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import playIcon from '@material-design-icons/svg/filled/play_arrow.svg';
import stopIcon from '@material-design-icons/svg/filled/stop.svg';

import classes from './WaveformPlayback.module.scss';

const WaveformPlayback = React.memo(
  /**
   * @param {{
   *   isPlaybackActive: boolean;
   *   playbackProgress: number;
   *   displayedTime: string;
   *   togglePlayback: (e: MouseEvent | KeyboardEvent) => void;
   * }} props
   */
  function WaveformPlayback({
    isPlaybackActive,
    playbackProgress,
    displayedTime,
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
        <div className={classes.playbackButtonContainer}>
          <OverlayTrigger
            delay={{ show: 400, hide: 0 }}
            overlay={
              <Tooltip>
                Preview how your sample will sound on the volca sample
              </Tooltip>
            }
          >
            <Button
              variant="dark"
              onClick={(e) => togglePlayback(e.nativeEvent)}
            >
              <img
                src={isPlaybackActive ? stopIcon : playIcon}
                alt="Play preview"
              />
            </Button>
          </OverlayTrigger>
          {displayedTime && <span>{displayedTime}</span>}
        </div>
      </>
    );
  }
);

export default WaveformPlayback;

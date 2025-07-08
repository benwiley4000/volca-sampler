import React, { useCallback } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PlayIcon from '@material-design-icons/svg/filled/play_arrow.svg';
import StopIcon from '@material-design-icons/svg/filled/stop.svg';
import DownloadIcon from '@material-design-icons/svg/filled/download.svg';

import { downloadBlob } from './utils/download.js';

import classes from './WaveformPlayback.module.scss';

const WaveformPlayback = React.memo(
  /**
   * @param {{
   *   isPlaybackActive: boolean;
   *   playbackProgress: number;
   *   displayedTime: string;
   *   downloadFilename: string;
   *   wavFile: Uint8Array | null;
   *   togglePlayback: (e: MouseEvent | KeyboardEvent) => void;
   * }} props
   */
  function WaveformPlayback({
    isPlaybackActive,
    playbackProgress,
    displayedTime,
    downloadFilename,
    wavFile,
    togglePlayback,
  }) {
    const handleDownload = useCallback(async () => {
      if (wavFile) {
        const blob = new Blob([wavFile], {
          type: 'audio/x-wav',
        });
        downloadBlob(blob, downloadFilename);
      }
    }, [downloadFilename, wavFile]);

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
              {isPlaybackActive ? <StopIcon /> : <PlayIcon />}
            </Button>
          </OverlayTrigger>
          {displayedTime && <span>{displayedTime}</span>}
        </div>
        <OverlayTrigger
          delay={{ show: 400, hide: 0 }}
          overlay={
            <Tooltip>
              Download a copy of the audio that will be transferred to the volca
              sample
            </Tooltip>
          }
        >
          <Button
            className={classes.downloadButton}
            type="button"
            variant="dark"
            size="sm"
            onClick={handleDownload}
            disabled={!wavFile}
          >
            <DownloadIcon />
          </Button>
        </OverlayTrigger>
      </>
    );
  }
);

export default WaveformPlayback;

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Form, OverlayTrigger, Tooltip, Collapse } from 'react-bootstrap';
import RangeSlider from 'react-bootstrap-range-slider';

import classes from './PitchControl.module.scss';

const PitchControl = React.memo(
  /**
   * @param {{
   *   sampleId: string;
   *   pitchAdjustment: number;
   *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
   * }} props
   */
  function QualityBitDepthControl({
    sampleId,
    pitchAdjustment,
    onSampleUpdate,
  }) {
    const [localPitchAdjustment, setLocalPitchAdjustment] =
      useState(pitchAdjustment);
    useEffect(() => {
      setLocalPitchAdjustment(pitchAdjustment);
    }, [pitchAdjustment]);
    /** @type {React.ChangeEventHandler<HTMLInputElement>} */
    const handleChange = useCallback((e) => {
      setLocalPitchAdjustment(Number(e.target.value));
    }, []);
    /** @type {React.RefObject<HTMLInputElement>} */
    const rangeInputRef = useRef(null);
    useEffect(() => {
      const input = rangeInputRef.current;
      if (input) {
        const onChangeEnd = () => {
          onSampleUpdate(sampleId, { pitchAdjustment: Number(input.value) });
        };
        input.addEventListener('change', onChangeEnd);
        return () => {
          input.removeEventListener('change', onChangeEnd);
        };
      }
    }, [sampleId, onSampleUpdate]);
    const [expanded, setExpanded] = useState(
      () => window.matchMedia('(min-width: 768px)').matches
    );
    return (
      <Form.Group
        className={[
          classes.pitchAdjustmentWrapper,
          expanded ? classes.expanded : '',
        ].join(' ')}
      >
        <OverlayTrigger
          delay={{ show: 400, hide: 0 }}
          overlay={
            <Tooltip>
              Pitching your audio up before transferring can save some space on
              your volca sample. You can pitch back down on the volca sample,
              but your sample rate will be reduced.
            </Tooltip>
          }
        >
          <Form.Label
            className={classes.label}
            onClick={() => setExpanded((e) => !e)}
            aria-controls="expand-sample-pitch"
            aria-expanded={expanded}
          >
            Adjust sample pitch&nbsp;
            <span className={classes.previewValue}>
              {Number(pitchAdjustment.toFixed(2))}x
            </span>
          </Form.Label>
        </OverlayTrigger>
        <Collapse in={expanded}>
          <div id="expand-sample-pitch">
            <div className={classes.ticks}>
              {[0.5, 1, 1.5, 2].map((value, i, { length }) => {
                const left = `calc(${(i * 100) / (length - 1)}% + ${
                  12 - 8 * i
                }px)`;
                const hidden = localPitchAdjustment === value;
                return (
                  <React.Fragment key={value}>
                    <label
                      className={['small', classes.tickLabel].join(' ')}
                      style={{
                        left,
                        visibility: hidden ? 'hidden' : undefined,
                      }}
                      onClick={() =>
                        onSampleUpdate(sampleId, { pitchAdjustment: value })
                      }
                    >
                      {value}x
                    </label>
                    <span
                      className={classes.tickMark}
                      style={{
                        left,
                        visibility: hidden ? 'hidden' : undefined,
                      }}
                    />
                  </React.Fragment>
                );
              })}
            </div>
            <RangeSlider
              value={localPitchAdjustment}
              min={0.5}
              max={2}
              step={0.01}
              size="lg"
              tooltip="on"
              tooltipLabel={(value) => `${Number(value.toFixed(2))}x`}
              tooltipPlacement="top"
              // fixes a z-fighting issue with other parts of the UI
              tooltipStyle={{ zIndex: 1020 }}
              onChange={handleChange}
              ref={rangeInputRef}
            />
            <div className={classes.annotations}>
              <label
                className={[
                  'small',
                  localPitchAdjustment < 1 ? classes.warn : '',
                ].join(' ')}
              >
                Larger footprint
              </label>
              <label className="small">Smaller footprint</label>
            </div>
          </div>
        </Collapse>
      </Form.Group>
    );
  }
);

export default PitchControl;

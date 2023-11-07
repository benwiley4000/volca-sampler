import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Form, OverlayTrigger, Tooltip, Collapse } from 'react-bootstrap';
import RangeSlider from 'react-bootstrap-range-slider';

import classes from './QualityBitDepthControl.module.scss';

const QualityBitDepthControl = React.memo(
  /**
   * @param {{
   *   sampleId: string;
   *   qualityBitDepth: number;
   *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
   * }} props
   */
  function QualityBitDepthControl({
    sampleId,
    qualityBitDepth,
    onSampleUpdate,
  }) {
    const [localQualityBitDepth, setLocalQualityBitDepth] =
      useState(qualityBitDepth);
    useEffect(() => {
      setLocalQualityBitDepth(qualityBitDepth);
    }, [qualityBitDepth]);
    /** @type {React.ChangeEventHandler<HTMLInputElement>} */
    const handleChange = useCallback((e) => {
      const qualityBitDepth = Number(e.target.value);
      setLocalQualityBitDepth(qualityBitDepth);
    }, []);
    /** @type {React.RefObject<HTMLInputElement>} */
    const rangeInputRef = useRef(null);
    useEffect(() => {
      const input = rangeInputRef.current;
      if (input) {
        const onChangeEnd = () => {
          const qualityBitDepth = Number(input.value);
          onSampleUpdate(sampleId, { qualityBitDepth });
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
          classes.qualityBitDepthWrapper,
          expanded ? classes.expanded : '',
        ].join(' ')}
      >
        <OverlayTrigger
          delay={{ show: 400, hide: 0 }}
          overlay={
            <Tooltip>
              Lowering quality reduces transfer time. It will <i>not</i> reduce
              the memory footprint.
            </Tooltip>
          }
        >
          <Form.Label
            className={classes.label}
            onClick={() => setExpanded((e) => !e)}
            aria-controls="expand-quality-bit-depth"
            aria-expanded={expanded}
          >
            Quality bit depth
            <span className={classes.previewValue}>
              &nbsp;{qualityBitDepth}
            </span>
          </Form.Label>
        </OverlayTrigger>
        <Collapse in={expanded}>
          <div id="expand-quality-bit-depth">
            <div className={classes.ticks}>
              {[8, 9, 10, 11, 12, 13, 14, 15, 16].map(
                (value, i, { length }) => {
                  const left = `calc(${(i * 100) / (length - 1)}% + ${
                    12 - 3 * i
                  }px)`;
                  const hidden = localQualityBitDepth === value;
                  return (
                    <React.Fragment key={value}>
                      <label
                        className={['small', classes.tickLabel].join(' ')}
                        style={{
                          left,
                          visibility: hidden ? 'hidden' : undefined,
                        }}
                        onClick={() =>
                          onSampleUpdate(sampleId, { qualityBitDepth: value })
                        }
                      >
                        {value}
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
                }
              )}
            </div>
            <RangeSlider
              value={localQualityBitDepth}
              step={1}
              min={8}
              max={16}
              size="lg"
              tooltip="on"
              tooltipPlacement="top"
              // fixes a z-fighting issue with other parts of the UI
              tooltipStyle={{ zIndex: 1020 }}
              onChange={handleChange}
              ref={rangeInputRef}
            />
            <div className={classes.annotations}>
              <label className="small">Faster transfer</label>
              <label className="small">Higher quality</label>
            </div>
          </div>
        </Collapse>
      </Form.Group>
    );
  }
);

export default QualityBitDepthControl;

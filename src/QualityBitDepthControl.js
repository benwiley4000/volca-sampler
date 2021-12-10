import React, { useCallback, useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
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
    return (
      <Form.Group className={classes.qualityBitDepthWrapper}>
        <Form.Label className={classes.label}>Quality bit depth</Form.Label>
        <div className={classes.ticks}>
          {[8, 9, 10, 11, 12, 13, 14, 15, 16].map((value, i, { length }) => {
            const left = `calc(${(i * 100) / (length - 1)}% + ${12 - 3 * i}px)`;
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
          })}
        </div>
        <RangeSlider
          value={localQualityBitDepth}
          step={1}
          min={8}
          max={16}
          size="lg"
          tooltip="on"
          tooltipPlacement="top"
          onChange={handleChange}
          ref={(input) =>
            input &&
            input.addEventListener('change', () => {
              const qualityBitDepth = Number(input.value);
              onSampleUpdate(sampleId, { qualityBitDepth });
            })
          }
        />
        <div className={classes.annotations}>
          <label className="small">Faster transfer</label>
          <label className="small">Higher quality</label>
        </div>
      </Form.Group>
    );
  }
);

export default QualityBitDepthControl;
import React from 'react';
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';

import classes from './NormalizeSwitch.module.scss';

const NormalizeSwitch = React.memo(
  /**
   * @param {{
   *   sampleId: string;
   *   normalize: boolean;
   *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
   * }} props
   */
  function NormalizeSwitch({ sampleId, normalize, onSampleUpdate }) {
    return (
      <Form.Group>
        <OverlayTrigger
          delay={{ show: 400, hide: 0 }}
          overlay={
            <Tooltip>
              Boosts your sample's volume so its peak is at the same level as
              your other normalized samples
            </Tooltip>
          }
        >
          <div className={classes.normalizeControlWrapper}>
            <Form.Switch
              label={
                <span
                  onClick={() =>
                    onSampleUpdate(sampleId, (metadata) => ({
                      normalize: !metadata.normalize,
                    }))
                  }
                >
                  Normalize
                </span>
              }
              checked={normalize}
              onChange={(e) =>
                onSampleUpdate(sampleId, { normalize: e.target.checked })
              }
            />
          </div>
        </OverlayTrigger>
      </Form.Group>
    );
  }
);

export default NormalizeSwitch;

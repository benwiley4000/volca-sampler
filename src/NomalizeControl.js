import React from 'react';
import {
  ButtonGroup,
  Form,
  OverlayTrigger,
  ToggleButton,
  Tooltip,
} from 'react-bootstrap';

const NormalizeSwitch = React.memo(
  /**
   * @param {{
   *   sampleId: string;
   *   normalize: import('./store').NormalizeSetting;
   *   onSampleUpdate: (id: string, update: import('./store').SampleMetadataUpdateArg) => void;
   * }} props
   */
  function NormalizeSwitch({ sampleId, normalize, onSampleUpdate }) {
    return (
      <div>
        <OverlayTrigger
          delay={{ show: 400, hide: 0 }}
          overlay={
            <Tooltip>
              Normalization boosts your sample's volume so its peak is at the
              same level as your other normalized samples
            </Tooltip>
          }
        >
          <Form.Label>Normalize</Form.Label>
        </OverlayTrigger>
        <br />
        <ButtonGroup>
          {
            /** @type {(NonNullable<import('./store').NormalizeSetting> | 'off')[]} */ ([
              'off',
              'all',
              'selection',
            ]).map((normalizeOption) => (
              <OverlayTrigger
                delay={{ show: 400, hide: 0 }}
                overlay={
                  <Tooltip>
                    {normalizeOption === 'all'
                      ? 'Normalized with respect to peak amplitude for full sampled audio'
                      : normalizeOption === 'selection'
                      ? 'Normalized with respect to peak amplitude for selected audio'
                      : 'Kept at originally recorded volume'}
                  </Tooltip>
                }
              >
                <ToggleButton
                  id="normalizeType"
                  key={normalizeOption}
                  type="radio"
                  size="sm"
                  variant="outline-secondary"
                  name="normalize"
                  value={normalizeOption}
                  checked={
                    normalizeOption === 'off'
                      ? !normalize
                      : normalizeOption === normalize
                  }
                  onClick={() => {
                    onSampleUpdate(sampleId, {
                      normalize:
                        normalizeOption === 'off' ? null : normalizeOption,
                    });
                  }}
                >
                  {normalizeOption === 'all'
                    ? 'All audio'
                    : normalizeOption === 'selection'
                    ? 'Selected audio'
                    : 'Off'}
                </ToggleButton>
              </OverlayTrigger>
            ))
          }
        </ButtonGroup>
      </div>
    );
  }
);

export default NormalizeSwitch;

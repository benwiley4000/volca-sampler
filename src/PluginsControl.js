import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Dropdown, DropdownButton, Form } from 'react-bootstrap';
import RangeSlider from 'react-bootstrap-range-slider';

import { getDefaultParams } from './utils/plugins';

/**
 * @param {{
 *   sampleId: string;
 *   pluginIndex: number;
 *   paramName: string;
 *   paramValue: number;
 *   paramDef: import('./utils/plugins').PluginParamDef | null;
 *   onSampleUpdate: (
 *     id: string,
 *     update: import('./store').SampleMetadataUpdateArg
 *   ) => void;
 * }} props
 */
function PluginParamControl({
  sampleId,
  pluginIndex,
  paramName,
  paramValue,
  paramDef,
  onSampleUpdate,
}) {
  const [localValue, setLocalValue] = useState(paramValue);
  useEffect(() => {
    setLocalValue(paramValue);
  }, [paramValue]);
  /** @type {React.ChangeEventHandler<HTMLInputElement>} */
  const handleChange = useCallback((e) => {
    const value = Number(e.target.value);
    setLocalValue(value);
  }, []);
  const update = useCallback(
    /** @param {number} value */ (value) => {
      onSampleUpdate(sampleId, (metadata) => {
        return {
          ...metadata,
          plugins: metadata.plugins.map((p, i) => {
            if (i === pluginIndex) {
              return {
                ...p,
                pluginParams: {
                  ...p.pluginParams,
                  [paramName]: value,
                },
              };
            }
            return p;
          }),
        };
      });
    },
    [sampleId, pluginIndex, paramName, onSampleUpdate]
  );
  /** @type {React.RefObject<HTMLInputElement>} */
  const rangeInputRef = useRef(null);
  /** @type {React.RefObject<HTMLInputElement>} */
  const numberInputRef = useRef(null);
  useEffect(() => {
    const rangeInput = rangeInputRef.current;
    if (rangeInput) {
      const onChangeEnd = () => {
        update(Number(rangeInput.value));
      };
      rangeInput.addEventListener('change', onChangeEnd);
      return () => {
        rangeInput.removeEventListener('change', onChangeEnd);
      };
    }
  }, [update]);
  useEffect(() => {
    const numberInput = numberInputRef.current;
    if (numberInput) {
      const onChangeEnd = () => {
        update(Number(numberInput.value));
      };
      numberInput.addEventListener('change', onChangeEnd);
      return () => {
        numberInput.removeEventListener('change', onChangeEnd);
      };
    }
  }, [update]);
  let step = 1;
  if (paramDef) {
    const range = paramDef.max - paramDef.min;
    if (range < 10) {
      step = 0.01;
    } else if (range < 100) {
      step = 0.1;
    }
  }
  return (
    <Form.Group>
      <Form.Label>{paramDef ? paramDef.label : paramName}</Form.Label>
      <RangeSlider
        disabled={!paramDef}
        value={localValue}
        min={paramDef ? paramDef.min : 0}
        max={paramDef ? paramDef.max : 0}
        step={step}
        size="lg"
        tooltip="off"
        onChange={handleChange}
        ref={rangeInputRef}
      />
      <Form.Control
        type="number"
        min={paramDef ? paramDef.min : undefined}
        max={paramDef ? paramDef.max : undefined}
        step={step}
        value={localValue}
        onChange={handleChange}
        ref={numberInputRef}
      />
    </Form.Group>
  );
}

/**
 * @param {{
 *   sampleId: string;
 *   pluginIndex: number;
 *   plugin: import('./store').PluginClientSpec;
 *   paramsDef: import('./utils/plugins').PluginParamsDef | null;
 *   isFirst: boolean;
 *   isLast: boolean;
 *   onSampleUpdate: (
 *     id: string,
 *     update: import('./store').SampleMetadataUpdateArg
 *   ) => void;
 * }} props
 */
function PluginControl({
  sampleId,
  pluginIndex,
  plugin,
  paramsDef,
  isFirst,
  isLast,
  onSampleUpdate,
}) {
  return (
    <div>
      <div>{plugin.pluginName}</div>
      <button
        type="button"
        onClick={() => {
          onSampleUpdate(sampleId, (metadata) => {
            return {
              ...metadata,
              plugins: metadata.plugins.map((p, i) => {
                if (i === pluginIndex) {
                  return {
                    ...p,
                    isBypassed: !p.isBypassed,
                  };
                }
                return p;
              }),
            };
          });
        }}
      >
        {plugin.isBypassed ? 'off' : 'on'}
      </button>
      {Object.entries(plugin.pluginParams).map(([paramName, paramValue]) => (
        <PluginParamControl
          key={paramName}
          sampleId={sampleId}
          pluginIndex={pluginIndex}
          paramName={paramName}
          paramValue={paramValue}
          paramDef={(paramsDef && paramsDef[paramName]) || null}
          onSampleUpdate={onSampleUpdate}
        />
      ))}
      <button
        disabled={isFirst}
        onClick={() => {
          onSampleUpdate(sampleId, (metadata) => {
            if (pluginIndex === 0) return metadata;
            const newPlugins = [...metadata.plugins];
            newPlugins[pluginIndex - 1] = metadata.plugins[pluginIndex];
            newPlugins[pluginIndex] = metadata.plugins[pluginIndex - 1];
            return {
              ...metadata,
              plugins: newPlugins,
            };
          });
        }}
      >
        Move up
      </button>
      <button
        disabled={isLast}
        onClick={() => {
          onSampleUpdate(sampleId, (metadata) => {
            if (pluginIndex === metadata.plugins.length - 1) return metadata;
            const newPlugins = [...metadata.plugins];
            newPlugins[pluginIndex + 1] = metadata.plugins[pluginIndex];
            newPlugins[pluginIndex] = metadata.plugins[pluginIndex + 1];
            return {
              ...metadata,
              plugins: newPlugins,
            };
          });
        }}
      >
        Move down
      </button>
      <button
        onClick={() => {
          onSampleUpdate(sampleId, (metadata) => {
            return {
              ...metadata,
              plugins: metadata.plugins.filter((_, i) => i !== pluginIndex),
            };
          });
        }}
      >
        Remove plugin
      </button>
    </div>
  );
}

const PluginsControl = React.memo(
  /**
   * @param {{
   *   sampleId: string;
   *   plugins: import('./store').PluginClientSpec[];
   *   pluginParamsDefs: Map<string, import('./utils/plugins').PluginParamsDef>;
   *   onSampleUpdate: (
   *     id: string,
   *     update: import('./store').SampleMetadataUpdateArg
   *   ) => void;
   *   onOpenPluginManager: () => void;
   * }} props
   */
  function PluginsControl({
    sampleId,
    plugins,
    pluginParamsDefs,
    onSampleUpdate,
    onOpenPluginManager,
  }) {
    /** @type {Record<string, number>} */
    const pluginNameCounts = {};
    for (const plugin of plugins) {
      pluginNameCounts[plugin.pluginName] = 0;
    }
    return (
      <>
        {plugins.map((p, i) => (
          <PluginControl
            key={`${p.pluginName}-${pluginNameCounts[p.pluginName]++}`}
            sampleId={sampleId}
            pluginIndex={i}
            plugin={p}
            paramsDef={pluginParamsDefs.get(p.pluginName) || null}
            isFirst={i === 0}
            isLast={i === plugins.length - 1}
            onSampleUpdate={onSampleUpdate}
          />
        ))}
        <DropdownButton variant="light" title="Add a plugin">
          <Dropdown.Item onClick={onOpenPluginManager}>
            Manage plugins
          </Dropdown.Item>
          <Dropdown.Divider />
          {!pluginParamsDefs.size && (
            <Dropdown.Item disabled>No plugins installed</Dropdown.Item>
          )}
          {[...pluginParamsDefs].map(([pluginName, pluginParamsDef]) => (
            <Dropdown.Item
              key={pluginName}
              onClick={() => {
                onSampleUpdate(sampleId, (metadata) => {
                  return {
                    ...metadata,
                    plugins: [
                      ...metadata.plugins,
                      {
                        pluginName,
                        pluginParams: getDefaultParams(pluginParamsDef),
                        isBypassed: false,
                      },
                    ],
                  };
                });
              }}
            >
              {pluginName}
            </Dropdown.Item>
          ))}
        </DropdownButton>
      </>
    );
  }
);

export default PluginsControl;

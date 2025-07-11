import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useContext,
  useMemo,
  useLayoutEffect,
  useImperativeHandle,
} from 'react';
import {
  Accordion,
  AccordionContext,
  Button,
  Card,
  Collapse,
  Dropdown,
  DropdownButton,
  Form,
  OverlayTrigger,
  Tooltip,
  useAccordionButton,
} from 'react-bootstrap';
import RangeSlider from 'react-bootstrap-range-slider';
import PowerSettingsNewIcon from '@material-design-icons/svg/filled/power_settings_new.svg';
import ArrowUpwardIcon from '@material-design-icons/svg/filled/arrow_upward.svg';
import ArrowDownwardIcon from '@material-design-icons/svg/filled/arrow_downward.svg';
import TuneIcon from '@material-design-icons/svg/filled/tune.svg';
import MoreVertIcon from '@material-design-icons/svg/filled/more_vert.svg';
import InfoIcon from '@material-design-icons/svg/filled/info.svg';
import SyncProblemIcon from '@material-design-icons/svg/filled/sync_problem.svg';
import PriorityHighIcon from '@material-design-icons/svg/filled/priority_high.svg';
import QuestionMarkIcon from '@material-design-icons/svg/filled/question_mark.svg';

import { getDefaultParams } from './utils/plugins';
import ToyBrickPlus from './icons/toy-brick-plus.svg';

import classes from './PluginsControl.module.scss';
import { reinitPlugin } from './pluginStore';

/**
 * @param {{
 *   sampleId: string;
 *   pluginIndex: number;
 *   isOff: boolean;
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
  isOff,
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
    <Form.Group className={classes.paramControl}>
      <div className={classes.paramControlInputGroup}>
        <div>
          <Form.Label>{(paramDef && paramDef.label) || paramName}</Form.Label>
          <RangeSlider
            variant={isOff ? 'secondary' : 'primary'}
            disabled={!paramDef}
            value={localValue}
            min={paramDef ? paramDef.min : 0}
            max={paramDef ? paramDef.max : 0}
            step={step}
            size="sm"
            tooltip="off"
            onChange={handleChange}
            ref={rangeInputRef}
          />
        </div>
        <Form.Control
          type="number"
          min={paramDef ? paramDef.min : undefined}
          max={paramDef ? paramDef.max : undefined}
          step={step}
          value={localValue}
          onChange={handleChange}
          ref={numberInputRef}
        />
      </div>
    </Form.Group>
  );
}

/**
 *
 * @param {{
 *   eventKey: string;
 *   disabled?: boolean;
 *   isNew: boolean;
 *   toggleRef: React.Ref<HTMLDivElement | null>;
 * }} props
 */
function PluginParamsToggle({
  eventKey,
  disabled,
  isNew,
  toggleRef: _toggleRef,
}) {
  const { activeEventKey } = useContext(AccordionContext);

  /** @type {React.RefObject<HTMLDivElement>} */
  const toggleRef = useRef(null);
  useImperativeHandle(_toggleRef, () => toggleRef.current);

  const isNewRef = useRef(isNew);
  useLayoutEffect(() => {
    if (isNewRef.current && toggleRef.current) {
      toggleRef.current.click();
    }
  }, []);

  const decoratedOnClick = useAccordionButton(eventKey);

  const isCurrentEventKey = activeEventKey === eventKey;

  return (
    <div
      ref={toggleRef}
      title={
        disabled
          ? 'No params'
          : isCurrentEventKey
          ? 'Hide params'
          : 'Edit params'
      }
      className={[classes.actionIcon, disabled ? classes.disabled : ''].join(
        ' '
      )}
      onClick={!disabled ? decoratedOnClick : undefined}
    >
      <TuneIcon />
    </div>
  );
}

const RemoveMenuToggle = React.forwardRef(
  /**
   * @param {{
   *   onClick: React.MouseEventHandler<HTMLDivElement>;
   * }} props
   */
  ({ onClick }, ref) => (
    <div
      className={classes.actionIcon}
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
    >
      <MoreVertIcon />
    </div>
  )
);

/**
 * @param {{
 *   eventKey: string;
 *   sampleId: string;
 *   pluginIndex: number;
 *   plugin: import('./store').PluginClientSpec;
 *   status: 'broken' | 'missing' | 'failed-previously' | 'ok';
 *   paramsDef: import('./utils/plugins').PluginParamsDef | null;
 *   isFirst: boolean;
 *   isLast: boolean;
 *   isNew: boolean;
 *   onSampleUpdate: (
 *     id: string,
 *     update: import('./store').SampleMetadataUpdateArg
 *   ) => void;
 *   onOpenPluginManager: () => void;
 * }} props
 */
function PluginControl({
  eventKey,
  sampleId,
  pluginIndex,
  plugin,
  status,
  paramsDef,
  isFirst,
  isLast,
  isNew,
  onSampleUpdate,
  onOpenPluginManager,
}) {
  const isActive = !plugin.isBypassed && status === 'ok';
  const effectiveStatus = plugin.isBypassed ? 'ok' : status;
  /** @type {React.RefObject<HTMLDivElement>} */
  const toggleRef = useRef(null);
  return (
    <Card className={classes.pluginItem}>
      <Card.Header className={classes.header}>
        <div
          className={[
            classes.pluginName,
            Object.keys(plugin.pluginParams).length ? classes.expandable : '',
          ].join(' ')}
          title={plugin.pluginName}
          onClick={() => toggleRef.current && toggleRef.current.click()}
        >
          {isActive ? (
            <strong>{plugin.pluginName}</strong>
          ) : effectiveStatus !== 'ok' ? (
            <span className={classes.pluginHasError}>{plugin.pluginName}</span>
          ) : (
            <span>{plugin.pluginName}</span>
          )}
        </div>
        <div className={classes.actions}>
          <div
            title={
              plugin.isBypassed ? 'Plugin is bypassed' : 'Plugin is active'
            }
            className={[
              classes.actionIcon,
              classes.toggle,
              plugin.isBypassed ? classes.off : classes.on,
            ].join(' ')}
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
            <PowerSettingsNewIcon />
          </div>
          <div
            title="Move up"
            className={[
              classes.actionIcon,
              isFirst ? classes.disabled : '',
            ].join(' ')}
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
            <ArrowUpwardIcon />
          </div>
          <div
            title="Move down"
            className={[
              classes.actionIcon,
              isLast ? classes.disabled : '',
            ].join(' ')}
            onClick={() => {
              onSampleUpdate(sampleId, (metadata) => {
                if (pluginIndex === metadata.plugins.length - 1)
                  return metadata;
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
            <ArrowDownwardIcon />
          </div>
          <PluginParamsToggle
            eventKey={eventKey}
            disabled={!Object.keys(plugin.pluginParams).length}
            isNew={isNew}
            toggleRef={toggleRef}
          />
          <Dropdown>
            <Dropdown.Toggle as={RemoveMenuToggle} />
            <Dropdown.Menu>
              <Dropdown.Item
                onClick={() => {
                  onSampleUpdate(sampleId, (metadata) => {
                    return {
                      ...metadata,
                      plugins: metadata.plugins.filter(
                        (_, i) => i !== pluginIndex
                      ),
                    };
                  });
                }}
              >
                Remove
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
        {(effectiveStatus === 'broken' ||
          effectiveStatus === 'failed-previously') && (
          <div
            title="There was a problem running the plugin"
            className={classes.errorIcon}
          >
            <PriorityHighIcon />
          </div>
        )}
        {effectiveStatus === 'missing' && (
          <div
            title="Plugin not found"
            className={classes.errorIcon}
            onClick={onOpenPluginManager}
          >
            <QuestionMarkIcon />
          </div>
        )}
      </Card.Header>
      <Accordion.Collapse eventKey={eventKey}>
        <Card.Body className={classes.paramsList}>
          {Object.keys(paramsDef || plugin.pluginParams).map((paramName) => {
            const paramDef = (paramsDef && paramsDef[paramName]) || null;
            let paramValue = plugin.pluginParams[paramName];
            if (paramDef && typeof paramValue !== 'number') {
              paramValue = paramDef.value;
            }
            return (
              <PluginParamControl
                key={paramName}
                sampleId={sampleId}
                pluginIndex={pluginIndex}
                isOff={!isActive}
                paramName={paramName}
                paramValue={paramValue}
                paramDef={paramDef}
                onSampleUpdate={onSampleUpdate}
              />
            );
          })}
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
}

const PluginsControl = React.memo(
  /**
   * @param {{
   *   sampleId: string;
   *   sampleCache: import('./sampleCacheStore').SampleCache | null;
   *   plugins: import('./store').PluginClientSpec[];
   *   pluginParamsDefs: Map<string, import('./utils/plugins').PluginParamsDef>;
   *   pluginStatusMap: Map<string, import('./pluginStore').PluginStatus> | null;
   *   isPluginManagerOpen: boolean;
   *   onSampleUpdate: (
   *     id: string,
   *     update: import('./store').SampleMetadataUpdateArg
   *   ) => void;
   *   onOpenPluginManager: () => void;
   *   onRecheckPlugins: () => void;
   *   onRegenerateSampleCache: (sampleId: string) => void;
   * }} props
   */
  function PluginsControl({
    sampleId,
    sampleCache,
    plugins,
    pluginParamsDefs,
    pluginStatusMap,
    isPluginManagerOpen,
    onSampleUpdate,
    onOpenPluginManager,
    onRecheckPlugins,
    onRegenerateSampleCache,
  }) {
    const pluginStatuses = useMemo(() => {
      return plugins.map((p, index) => {
        const pluginStatus = pluginStatusMap
          ? pluginStatusMap.get(p.pluginName)
          : 'ok';
        if (pluginStatus !== 'installed') return pluginStatus || 'missing';
        if (
          !p.isBypassed &&
          sampleCache &&
          sampleCache.cachedInfo.failedPluginIndex === index
        ) {
          return 'failed-previously';
        }
        return 'ok';
      });
    }, [plugins, pluginStatusMap, sampleCache]);
    const arePluginsOk = pluginStatuses
      .filter((_, i) => !plugins[i].isBypassed)
      .every((status) => status === 'ok');

    /** @type {Record<string, number>} */
    const pluginNameCounts = {};
    let activeCount = 0;
    let bypassedCount = 0;
    for (const plugin of plugins) {
      pluginNameCounts[plugin.pluginName] = 0;
      if (plugin.isBypassed) {
        bypassedCount++;
      } else {
        activeCount++;
      }
    }
    const [expanded, setExpanded] = useState(
      () => window.matchMedia('(min-width: 768px)').matches
    );

    // Keep track of which plugins were visible when the sample was
    // loaded, this way we can auto-expand any new plugins when added
    const initialPluginsRef = useRef(plugins);
    const lastSampleIdRef = useRef(sampleId);
    if (sampleId !== lastSampleIdRef.current) {
      initialPluginsRef.current = plugins;
      lastSampleIdRef.current = sampleId;
    }

    const [preventAddPluginAutoClose, setPreventAddPluginAutoClose] =
      useState(false);
    useEffect(() => {
      if (isPluginManagerOpen) {
        return () => {
          requestAnimationFrame(() => {
            setPreventAddPluginAutoClose(false);
          });
        };
      }
    }, [isPluginManagerOpen]);

    const [paramsDefsOnLastDropdownOpen, setParamsDefsOnLastDropdownOpen] =
      useState(pluginParamsDefs);

    return (
      <Form.Group
        className={[
          classes.pluginsControlWrapper,
          expanded ? classes.expanded : '',
        ].join(' ')}
      >
        <OverlayTrigger
          delay={{ show: 400, hide: 0 }}
          overlay={
            <Tooltip>
              Plugins let you add custom pre-processing to your samples.
            </Tooltip>
          }
        >
          <Form.Label
            className={classes.label}
            onClick={() => setExpanded((e) => !e)}
            aria-controls="expand-plugins"
            aria-expanded={expanded}
          >
            Plugins
            {arePluginsOk && (
              <span className={classes.previewValue}>
                &nbsp;{activeCount} active, {bypassedCount} bypassed
              </span>
            )}
            {!arePluginsOk && (
              <span
                className={classes.reloadPlugins}
                onClick={async (e) => {
                  e.stopPropagation();
                  await Promise.allSettled(
                    plugins
                      .filter(
                        (p) =>
                          pluginStatusMap &&
                          pluginStatusMap.get(p.pluginName) === 'broken'
                      )
                      .map((p) => reinitPlugin(p.pluginName))
                  );
                  onRecheckPlugins();
                  onRegenerateSampleCache(sampleId);
                }}
              >
                <SyncProblemIcon />
                <span>Reload</span>
              </span>
            )}
          </Form.Label>
        </OverlayTrigger>
        <Collapse in={expanded}>
          <div id="expand-plugins">
            <div className={classes.pluginsControl}>
              <Accordion
                hidden={!plugins.length}
                className={classes.pluginList}
              >
                {plugins.map((p, i) => {
                  const key = `${p.pluginName}-${pluginNameCounts[
                    p.pluginName
                  ]++}`;
                  return (
                    <PluginControl
                      key={key}
                      eventKey={key}
                      sampleId={sampleId}
                      pluginIndex={i}
                      plugin={p}
                      status={pluginStatuses[i]}
                      paramsDef={pluginParamsDefs.get(p.pluginName) || null}
                      isFirst={i === 0}
                      isLast={i === plugins.length - 1}
                      isNew={!initialPluginsRef.current.includes(p)}
                      onSampleUpdate={onSampleUpdate}
                      onOpenPluginManager={onOpenPluginManager}
                    />
                  );
                })}
              </Accordion>
              <div className={classes.pluginOptions}>
                <DropdownButton
                  variant="outline-secondary"
                  title={
                    <span className={classes.addAPlugin}>
                      <ToyBrickPlus />
                      <span>Add a plugin</span>
                    </span>
                  }
                  onToggle={(show) => {
                    if (show) {
                      setParamsDefsOnLastDropdownOpen(pluginParamsDefs);
                    }
                  }}
                  autoClose={!preventAddPluginAutoClose}
                >
                  <Dropdown.Item
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreventAddPluginAutoClose(true);
                      onOpenPluginManager();
                    }}
                  >
                    Install a new plugin
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  {!pluginParamsDefs.size && (
                    <Dropdown.Item disabled>No plugins installed</Dropdown.Item>
                  )}
                  {[...pluginParamsDefs].map(
                    ([pluginName, pluginParamsDef]) => (
                      <Dropdown.Item
                        key={pluginName}
                        className={
                          [...paramsDefsOnLastDropdownOpen.keys()].find(
                            (name) => name === pluginName
                          )
                            ? ''
                            : classes.justAdded
                        }
                        onClick={() => {
                          onSampleUpdate(sampleId, (metadata) => {
                            return {
                              ...metadata,
                              plugins: [
                                ...metadata.plugins,
                                {
                                  pluginName,
                                  pluginParams:
                                    getDefaultParams(pluginParamsDef),
                                  isBypassed: false,
                                },
                              ],
                            };
                          });
                        }}
                      >
                        {pluginName}
                      </Dropdown.Item>
                    )
                  )}
                </DropdownButton>
                <Button
                  className={classes.managePlugins}
                  variant="outline-secondary"
                  onClick={onOpenPluginManager}
                >
                  <InfoIcon />
                  <span>Plugins overview</span>
                </Button>
              </div>
            </div>
          </div>
        </Collapse>
      </Form.Group>
    );
  }
);

export default PluginsControl;

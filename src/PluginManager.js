import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ListGroup, Modal } from 'react-bootstrap';
import { ReactComponent as EditIcon } from '@material-design-icons/svg/filled/edit.svg';
import { ReactComponent as SyncProblemIcon } from '@material-design-icons/svg/filled/sync_problem.svg';
import { ReactComponent as CodeIcon } from '@material-design-icons/svg/filled/code.svg';
import { ReactComponent as DownloadIcon } from '@material-design-icons/svg/filled/download.svg';

import {
  addPlugin,
  addPluginFromFile,
  getPluginSource,
  reinitPlugin,
  removePlugin,
  renamePlugin,
} from './pluginStore';
import PluginConfirmModal from './PluginConfirmModal';
import { ReactComponent as ToyBrickPlus } from './icons/toy-brick-plus.svg';
import { ReactComponent as ToyBrickRemove } from './icons/toy-brick-remove.svg';

import classes from './PluginManager.module.scss';
import { getExamplePlugins, getPluginSourceLink } from './utils/github';
import { downloadBlob } from './utils/download';

/** @typedef {import('./store').SampleContainer} SampleContainer */

const PluginManager = React.memo(
  /**
   * @param {{
   *   isOpen: boolean;
   *   pluginList: string[];
   *   pluginStatusMap: Map<string, import('./pluginStore').PluginStatus>;
   *   userSamples: Map<string, SampleContainer>;
   *   onUpdatePluginList: () => void;
   *   onSampleUpdate: (
   *     id: string[],
   *     update: import('./store').SampleMetadataUpdateArg
   *   ) => void;
   *   onSampleBulkReplace: (samples: SampleContainer[]) => void;
   *   onClose: () => void;
   * }} props
   */
  function PluginManager({
    isOpen,
    pluginList,
    pluginStatusMap,
    userSamples,
    onUpdatePluginList,
    onSampleUpdate,
    onSampleBulkReplace,
    onClose,
  }) {
    const pluginUsageCounts = useMemo(() => {
      /** @type {Record<string, number>} */
      const counts = {};
      for (const pluginName of pluginList) {
        counts[pluginName] = 0;
      }
      for (const [, sample] of userSamples) {
        const { plugins } = sample.metadata;
        for (const pluginName of pluginList) {
          if (plugins.some((p) => p.pluginName === pluginName)) {
            counts[pluginName]++;
          }
        }
      }
      return counts;
    }, [pluginList, userSamples]);

    const [pluginConfirmationState, setPluginConfirmationState] = useState(
      /**
       * @type {{
       *   pluginName: string;
       *   variant: 'confirm-name' | 'replace' | 'rename';
       *   onConfirmName: (name: string) => void;
       *   onConfirmReplace: (
       *     replaceResponse: 'replace' | 'use-existing' | 'change-name'
       *   ) => void;
       *   onCancelRename: () => void;
       * } | null}
       */
      (null)
    );

    const handleAddPluginFromFile = useCallback(
      /** @param {React.ChangeEvent<HTMLInputElement>} e */
      async (e) => {
        if (!e.target.files) return;
        const file = e.target.files.item(0);
        if (!file) return;
        void addPluginFromFile({
          file,
          onConfirmName(name) {
            return /** @type {Promise<string>} */ (
              new Promise((resolve) => {
                setPluginConfirmationState({
                  pluginName: name,
                  variant: 'confirm-name',
                  onConfirmName(newName) {
                    resolve(newName);
                    setPluginConfirmationState(null);
                  },
                  onConfirmReplace() {},
                  onCancelRename() {},
                });
              })
            );
          },
          onConfirmReplace(name) {
            /** @type {Promise<'replace' | 'use-existing' | 'change-name'>} */
            return new Promise((resolve) => {
              setPluginConfirmationState({
                pluginName: name,
                variant: 'replace',
                onConfirmReplace(replaceResponse) {
                  resolve(replaceResponse);
                  setPluginConfirmationState(null);
                },
                onConfirmName() {},
                onCancelRename() {},
              });
            });
          },
        }).then(onUpdatePluginList);
        // this removes the file from the input so it can be selected again if
        // needed.
        e.target.value = '';
      },
      [onUpdatePluginList]
    );

    const handleAddPluginFromSource = useCallback(
      /**
       * @param {string} pluginName
       * @param {string} pluginSource
       */
      async (pluginName, pluginSource) => {
        await addPlugin({
          pluginName,
          pluginSource,
          onConfirmName(name) {
            return /** @type {Promise<string>} */ (
              new Promise((resolve) => {
                setPluginConfirmationState({
                  pluginName: name,
                  variant: 'confirm-name',
                  onConfirmName(newName) {
                    resolve(newName);
                    setPluginConfirmationState(null);
                  },
                  onConfirmReplace() {},
                  onCancelRename() {},
                });
              })
            );
          },
          onConfirmReplace(name) {
            /** @type {Promise<'replace' | 'use-existing' | 'change-name'>} */
            return new Promise((resolve) => {
              setPluginConfirmationState({
                pluginName: name,
                variant: 'replace',
                onConfirmReplace(replaceResponse) {
                  resolve(replaceResponse);
                  setPluginConfirmationState(null);
                },
                onConfirmName() {},
                onCancelRename() {},
              });
            });
          },
        });
        onUpdatePluginList();
      },
      [onUpdatePluginList]
    );

    /** @param {string} pluginName */
    const handleRenamePlugin = async (pluginName) => {
      const newPluginName = await /** @type {Promise<string>} */ (
        new Promise((resolve) => {
          setPluginConfirmationState({
            pluginName,
            variant: 'rename',
            onConfirmName(newName) {
              resolve(newName);
              setPluginConfirmationState(null);
            },
            onConfirmReplace() {},
            onCancelRename() {
              resolve('');
              setPluginConfirmationState(null);
            },
          });
        })
      );
      if (!newPluginName) return;
      const updatedSamples = await renamePlugin({
        oldPluginName: pluginName,
        newPluginName,
        onConfirmName(name) {
          return /** @type {Promise<string>} */ (
            new Promise((resolve) => {
              setPluginConfirmationState({
                pluginName: name,
                variant: 'confirm-name',
                onConfirmName(newName) {
                  resolve(newName);
                  setPluginConfirmationState(null);
                },
                onConfirmReplace() {},
                onCancelRename() {},
              });
            })
          );
        },
        onConfirmReplace(name) {
          /** @type {Promise<'replace' | 'use-existing' | 'change-name'>} */
          return new Promise((resolve) => {
            setPluginConfirmationState({
              pluginName: name,
              variant: 'replace',
              onConfirmReplace(replaceResponse) {
                resolve(replaceResponse);
                setPluginConfirmationState(null);
              },
              onConfirmName() {},
              onCancelRename() {},
            });
          });
        },
        userSamples,
      });
      onSampleBulkReplace(updatedSamples);
      onUpdatePluginList();
    };

    const [maybeRemovingPluginName, setMaybeRemovingPluginName] = useState('');

    const [examplePlugins, setExamplePlugins] = useState(
      /** @type {Awaited<ReturnType<typeof getExamplePlugins>>} */ ([])
    );
    useEffect(() => {
      getExamplePlugins().then(setExamplePlugins);
    }, []);
    const suggestedPlugins = useMemo(() => {
      return examplePlugins.filter(
        ({ pluginName }) => !pluginList.includes(pluginName)
      );
    }, [examplePlugins, pluginList]);

    return (
      <>
        <Modal
          onHide={onClose}
          show={isOpen}
          aria-labelledby="plugin-manager-modal"
        >
          <Modal.Header>
            <Modal.Title id="plugin-manager-modal">Manage plugins</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Plugins use custom JavaScript to extend Volca Sampler's sample
              pre-processing capabilities. You only need{' '}
              <strong>basic programming knowledge</strong> to{' '}
              <a
                href="https://github.com/benwiley4000/volca-sampler-plugins"
                target="_blank"
                rel="noreferrer"
              >
                get started writing your own plugins
              </a>
              . You can share your plugins with others, and{' '}
              <strong>
                install plugins written by other Volca Sample owners
              </strong>
              .
            </p>
            <div className={classes.pluginListTitle}>
              <h5>Installed plugins</h5>
              <Button
                className={classes.installPlugin}
                type="button"
                variant="primary"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input && e.target !== input) {
                    input.click();
                  }
                }}
              >
                <ToyBrickPlus />
                <span>Install a plugin</span>
                <input
                  hidden
                  type="file"
                  accept="text/javascript"
                  onChange={handleAddPluginFromFile}
                />
              </Button>
            </div>
            <ListGroup>
              {!pluginList.length && (
                <ListGroup.Item className={classes.noneInstalled}>
                  There are no plugins installed.
                </ListGroup.Item>
              )}
              {pluginList.map((pluginName) => (
                <ListGroup.Item key={pluginName} className={classes.pluginItem}>
                  <div className={classes.nameAndInfo}>
                    <div className={classes.name}>
                      <span title={pluginName}>{pluginName}</span>
                      <div
                        className={classes.rename}
                        title="Rename plugin"
                        onClick={() => handleRenamePlugin(pluginName)}
                      >
                        <EditIcon />
                      </div>
                    </div>
                    <div className={classes.info}>
                      Used by {pluginUsageCounts[pluginName]} sample(s)
                    </div>
                  </div>
                  <div className={classes.actions}>
                    {pluginStatusMap.get(pluginName) === 'broken' && (
                      <div
                        className={classes.reloadPlugin}
                        onClick={async () => {
                          await reinitPlugin(pluginName);
                          onUpdatePluginList();
                        }}
                      >
                        <SyncProblemIcon />
                        Reload plugin
                      </div>
                    )}
                    <div
                      title="Download plugin"
                      className={classes.downloadPlugin}
                      onClick={async () => {
                        const pluginSource = await getPluginSource(pluginName);
                        if (!pluginSource) return;
                        const blob = new Blob([pluginSource], {
                          type: 'text/javascript',
                        });
                        downloadBlob(blob, pluginName);
                      }}
                    >
                      <DownloadIcon />
                    </div>
                    <div
                      title="Uninstall plugin"
                      className={classes.uninstallButton}
                      onClick={() => setMaybeRemovingPluginName(pluginName)}
                    >
                      <ToyBrickRemove />
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
            {Boolean(suggestedPlugins.length) && (
              <>
                <h5 className={classes.suggestedPluginsTitle}>
                  Suggested plugins
                </h5>
                <ListGroup className={classes.suggestedPlugins}>
                  {suggestedPlugins.map(({ pluginName, pluginSource }) => (
                    <ListGroup.Item
                      key={pluginName}
                      className={classes.pluginItem}
                    >
                      <div className={classes.nameAndInfo}>
                        <div className={classes.name}>
                          <span title={pluginName}>{pluginName}</span>
                        </div>
                      </div>
                      <div className={classes.actions}>
                        <a
                          className={classes.viewSource}
                          href={getPluginSourceLink(pluginName)}
                          target="_blank"
                          rel="noreferrer"
                          title="View Source"
                        >
                          <CodeIcon />
                        </a>
                        <Button
                          title="Install plugin"
                          className={classes.installSuggestedPlugin}
                          onClick={() =>
                            handleAddPluginFromSource(pluginName, pluginSource)
                          }
                        >
                          <ToyBrickPlus />
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="light" onClick={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal
          className={classes.uninstallModal}
          onHide={() => setMaybeRemovingPluginName('')}
          show={Boolean(maybeRemovingPluginName)}
          aria-labelledby="uninstall-plugin-modal"
          centered
        >
          <Modal.Header>
            <Modal.Title id="uninstall-plugin-modal">
              Uninstalling plugin
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Are you sure you want to uninstall{' '}
              <strong>{maybeRemovingPluginName}</strong>?
            </p>
            {pluginUsageCounts[maybeRemovingPluginName] ? (
              <p>
                The plugin will be{' '}
                <strong>
                  removed from {pluginUsageCounts[maybeRemovingPluginName]}{' '}
                  sample(s)
                </strong>
                . This can't be undone.
              </p>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="light"
              onClick={() => setMaybeRemovingPluginName('')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const affectedSampleIds = [...userSamples.values()]
                  .filter((s) =>
                    s.metadata.plugins.some(
                      (p) => p.pluginName === maybeRemovingPluginName
                    )
                  )
                  .map((s) => s.id);
                if (affectedSampleIds.length) {
                  onSampleUpdate(affectedSampleIds, (metadata) => {
                    return {
                      ...metadata,
                      plugins: metadata.plugins.filter(
                        (p) => p.pluginName !== maybeRemovingPluginName
                      ),
                    };
                  });
                }
                removePlugin(maybeRemovingPluginName).then(onUpdatePluginList);
                setMaybeRemovingPluginName('');
              }}
            >
              Uninstall
            </Button>
          </Modal.Footer>
        </Modal>
        {pluginConfirmationState && (
          <PluginConfirmModal {...pluginConfirmationState} />
        )}
      </>
    );
  }
);

export default PluginManager;

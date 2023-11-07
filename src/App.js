import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Container, Nav } from 'react-bootstrap';

import Header from './Header.js';
import SampleDetail from './SampleDetail.js';
import SampleDetailReadonly from './SampleDetailReadonly.js';
import SampleRecord from './SampleRecord.js';
import SampleMenu from './SampleMenu.js';
import Footer from './Footer.js';
import PluginManager from './PluginManager.js';
import {
  getFactorySamples,
  SampleContainer,
  sampleContainerDateCompare,
  storeAudioSourceFile,
} from './store.js';
import { SampleCache } from './sampleCacheStore.js';
import { getSamplePeaksForAudioBuffer } from './utils/waveform.js';
import { getAudioBufferForAudioFileData } from './utils/audioData.js';
import { newSampleName } from './utils/words.js';
import { onTabUpdateEvent, sendTabUpdateEvent } from './utils/tabSync.js';
import { getPluginStatus, listPluginParams } from './pluginStore.js';

import classes from './App.module.scss';
import { getPlugin } from './utils/plugins.js';

const sessionStorageKey = 'focused_sample_id';

/** @typedef {import('./sampleCacheStore.js').CachedInfo} CachedInfo */

function App() {
  const [userSamples, setUserSamples] = useState(
    /** @type {Map<string, SampleContainer>} */ (new Map())
  );
  const [userSampleCaches, setUserSampleCaches] = useState(
    /** @type {Map<string, SampleCache>} */ (new Map())
  );
  const [factorySamples, setFactorySamples] = useState(
    /** @type {Map<string, SampleContainer>} */ (new Map())
  );
  const [factorySampleCaches, setFactorySampleCaches] = useState(
    /** @type {Map<string, SampleCache>} */ (new Map())
  );
  const allSamples = useMemo(() => {
    return new Map([...userSamples, ...factorySamples]);
  }, [userSamples, factorySamples]);
  useEffect(() => {
    getFactorySamples()
      .then((factorySamples) => {
        setFactorySamples(
          new Map(
            [...factorySamples].map(([id, { sampleContainer }]) => [
              id,
              sampleContainer,
            ])
          )
        );
        setFactorySampleCaches(
          new Map(
            [...factorySamples].map(([id, { sampleContainer, cachedInfo }]) => [
              id,
              new SampleCache({ sampleContainer, cachedInfo }),
            ])
          )
        );
      })
      .catch(console.error);
  }, []);
  const restoredFocusedSampleId = sessionStorage.getItem(sessionStorageKey);
  const [focusedSampleId, setFocusedSampleId] = useState(
    /** @type {string | null} */ (
      restoredFocusedSampleId && typeof restoredFocusedSampleId === 'string'
        ? restoredFocusedSampleId
        : null
    )
  );
  useEffect(() => {
    if (focusedSampleId) {
      sessionStorage.setItem(sessionStorageKey, focusedSampleId);
    } else {
      sessionStorage.removeItem(sessionStorageKey);
    }
  }, [focusedSampleId]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  useEffect(() => {
    // TODO: error handling
    SampleContainer.getAllFromStorage()
      .then(async ({ sampleContainers: storedSamples, cachedInfos }) => {
        setUserSamples((samples) => {
          const newSamples = new Map([
            ...samples,
            ...storedSamples.map(
              (sample) =>
                /** @type {[string, SampleContainer]} */ ([sample.id, sample])
            ),
          ]);
          return new Map(
            [...newSamples].sort(([, a], [, b]) =>
              sampleContainerDateCompare(a, b)
            )
          );
        });
        const storedSampleCachedInfo =
          await SampleCache.getAllCachedInfoFromStore();
        // Create sample caches for any samples that are missing one
        const samplesWithoutCache = storedSamples.filter(
          (s) => !cachedInfos.has(s.id) && !storedSampleCachedInfo.has(s.id)
        );
        for (const sample of samplesWithoutCache) {
          SampleCache.importToStorage(sample).then((sampleCache) => {
            setUserSampleCaches((sampleCaches) =>
              new Map(sampleCaches).set(sample.id, sampleCache)
            );
          });
        }
        // And add the rest of the sample caches that we have already
        setUserSampleCaches((sampleCaches) => {
          return new Map([
            ...sampleCaches,
            ...storedSamples
              .filter(
                (s) => storedSampleCachedInfo.has(s.id) || cachedInfos.has(s.id)
              )
              .map((sampleContainer) => {
                const upgradedCachedInfo = cachedInfos.get(sampleContainer.id);
                if (upgradedCachedInfo) {
                  return /** @type {[string, SampleCache]} */ ([
                    sampleContainer.id,
                    new SampleCache.Mutable.Upgraded({
                      sampleContainer,
                      cachedInfo: upgradedCachedInfo,
                    }),
                  ]);
                }
                return /** @type {[string, SampleCache]} */ ([
                  sampleContainer.id,
                  new SampleCache.Mutable({
                    sampleContainer,
                    cachedInfo: /** @type {CachedInfo} */ (
                      storedSampleCachedInfo.get(sampleContainer.id)
                    ),
                  }),
                ]);
              }),
          ]);
        });
      })
      .finally(() => {
        setLoadingSamples(false);
      });
  }, []);

  /**
   * @type {(audioFileBuffer: Uint8Array, userFile?: File) => Promise<'saved' | 'silent'>}
   * */
  const handleRecordFinish = useCallback(async (audioFileBuffer, userFile) => {
    const audioBuffer = await getAudioBufferForAudioFileData(audioFileBuffer);
    /**
     * @type {[number, number]}
     */
    const trimFrames = [0, 0];
    const waveformPeaks = await getSamplePeaksForAudioBuffer(
      audioBuffer,
      trimFrames
    );
    if (
      [...waveformPeaks.positive, ...waveformPeaks.negative].every(
        (peak) => peak === 0
      )
    ) {
      return 'silent';
    }
    const sourceFileId = await storeAudioSourceFile(audioFileBuffer);
    /**
     * @type {string}
     */
    let name = '';
    let userFileExtension = '';
    if (userFile) {
      const lastDotIndex = userFile.name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        name = userFile.name.slice(0, lastDotIndex);
        userFileExtension = userFile.name.slice(lastDotIndex);
      } else {
        name = userFile.name;
      }
    } else {
      name = newSampleName();
    }
    const sample = new SampleContainer.Mutable({
      name,
      sourceFileId,
      trim: { frames: trimFrames },
      userFileInfo: userFile && {
        type: userFile.type,
        ext: userFileExtension,
      },
    });
    await sample.persist();
    setUserSamples((samples) => new Map([[sample.id, sample], ...samples]));
    setFocusedSampleId(sample.id);
    Promise.resolve().then(() =>
      sendTabUpdateEvent('sample', [sample.id], 'create')
    );
    const sampleCache = new SampleCache.Mutable({
      sampleContainer: sample,
      cachedInfo: {
        waveformPeaks,
        postPluginFrameCount: audioBuffer.length,
        duration: audioBuffer.duration,
        failedPluginIndex: -1,
      },
    });
    await sampleCache.persist();
    setUserSampleCaches((caches) =>
      new Map(caches).set(sample.id, sampleCache)
    );
    Promise.resolve().then(() =>
      sendTabUpdateEvent('cache', [sample.id], 'create')
    );
    return 'saved';
  }, []);

  const userSampleCachesRef = useRef(userSampleCaches);
  userSampleCachesRef.current = userSampleCaches;

  /**
   * @type {(id: string | string[], update: import('./store').SampleMetadataUpdateArg) => void}
   */
  const handleSampleUpdate = useCallback((id, updater) => {
    const ids = id instanceof Array ? id : [id];
    setUserSamples((samples) => {
      const sampleList = /** @type {SampleContainer[]} */ (
        ids
          .map((id) => {
            const s = samples.get(id);
            return (s && s instanceof SampleContainer.Mutable && s) || null;
          })
          .filter(Boolean)
      );
      if (!sampleList.length) return samples;

      /** @type {Promise<void>[]} */
      const persistPromises = [];
      const updatedSampleList = sampleList.map((sample) => {
        if (!(sample instanceof SampleContainer.Mutable)) {
          return sample;
        }
        let onPersisted = () => {};
        persistPromises.push(new Promise((resolve) => (onPersisted = resolve)));
        const updated = sample.update(updater, onPersisted);
        if (updated !== sample) {
          Promise.resolve().then(async () => {
            const sampleCache = userSampleCachesRef.current.get(sample.id);
            if (!(sampleCache && sampleCache instanceof SampleCache.Mutable))
              return;
            await Promise.all(persistPromises);
            const newSampleCache = await sampleCache.update(updated);
            if (newSampleCache === sampleCache) {
              return;
            }
            if (newSampleCache.sampleContainer !== updated) {
              setUserSamples((samples) => {
                const newSamples = new Map(samples);
                newSamples.delete(sample.id);
                return new Map([
                  [sample.id, newSampleCache.sampleContainer],
                  ...newSamples,
                ]);
              });
              sendTabUpdateEvent('sample', [sample.id], 'edit');
            }
            setUserSampleCaches((caches) =>
              new Map(caches).set(sample.id, newSampleCache)
            );
            sendTabUpdateEvent('cache', [sample.id], 'edit');
          });
        }
        return updated;
      });
      if (updatedSampleList.every((s, i) => sampleList[i] === s)) {
        return samples;
      }
      Promise.all(persistPromises).then(() => {
        sendTabUpdateEvent(
          'sample',
          updatedSampleList.map((s) => s.id),
          'edit'
        );
      });
      const newSamples = new Map(samples);
      for (const { id } of updatedSampleList) {
        newSamples.delete(id);
      }
      return new Map([
        ...updatedSampleList
          .slice()
          .sort(sampleContainerDateCompare)
          .map((s) => /** @type {[string, SampleContainer]} */ ([s.id, s])),
        ...newSamples,
      ]);
    });
  }, []);
  /**
   * @type {(
   *   bulkAddSamples: SampleContainer[],
   *   bulkAddSampleCaches: SampleCache[]
   * ) => void}
   */
  const handleSampleBulkAdd = useCallback(
    (bulkAddSamples, bulkAddSampleCaches) => {
      setUserSamples((samples) => {
        const newSamples = new Map([
          ...samples,
          ...bulkAddSamples.map(
            (s) => /** @type {[string, SampleContainer]} */ ([s.id, s])
          ),
        ]);
        return new Map(
          [...newSamples].sort(([, a], [, b]) =>
            sampleContainerDateCompare(a, b)
          )
        );
      });
      sendTabUpdateEvent(
        'sample',
        bulkAddSamples.map((s) => s.id),
        'create'
      );
      setUserSampleCaches((caches) => {
        return new Map([
          ...caches,
          ...bulkAddSampleCaches.map(
            (s) =>
              /** @type {[string, SampleCache]} */ ([s.sampleContainer.id, s])
          ),
        ]);
      });
      sendTabUpdateEvent(
        'cache',
        bulkAddSampleCaches.map((s) => s.sampleContainer.id),
        'create'
      );
      setSelectedMobilePage('sampleList');
    },
    []
  );

  /**
   * This is limited to rare use cases replacing data that doesn't
   * need to change the sample modified date and doesn't need to
   * update the sample cache. For now the only use case is for
   * renaming a plugin.
   * @type {(samples: SampleContainer[]) => void}
   */
  const handleSampleBulkReplace = useCallback((samples) => {
    setUserSamples((samples) => {
      const newSamples = new Map(samples);
      for (const [id, sample] of samples) {
        if (newSamples.has(id)) {
          newSamples.set(id, sample);
        }
      }
      return newSamples;
    });
    sendTabUpdateEvent(
      'sample',
      samples.map((s) => s.id),
      'edit'
    );
  }, []);

  const allSamplesRef = useRef(allSamples);
  allSamplesRef.current = allSamples;
  const factorySampleCachesRef = useRef(factorySampleCaches);
  factorySampleCachesRef.current = factorySampleCaches;
  const handleSampleDuplicate = useCallback(
    /**
     * @param {string} id
     */
    (id) => {
      const sample = allSamplesRef.current.get(id);
      if (sample) {
        const newSample = sample.duplicate((id) => {
          sendTabUpdateEvent('sample', [id], 'create');
        });
        setUserSamples(
          (samples) => new Map([[newSample.id, newSample], ...samples])
        );
        const oldSampleCache =
          userSampleCachesRef.current.get(id) ||
          factorySampleCachesRef.current.get(id);
        if (oldSampleCache) {
          const newSampleCache = new SampleCache.Mutable({
            sampleContainer: newSample,
            cachedInfo: oldSampleCache.cachedInfo,
          });
          newSampleCache.persist().then(() => {
            sendTabUpdateEvent('cache', [newSample.id], 'create');
          });
          setUserSampleCaches((caches) =>
            new Map(caches).set(newSample.id, newSampleCache)
          );
        }
        setFocusedSampleId(newSample.id);
      }
    },
    []
  );

  const userSamplesRef = useRef(userSamples);
  userSamplesRef.current = userSamples;
  const focusedSampleIdRef = useRef(focusedSampleId);
  focusedSampleIdRef.current = focusedSampleId;
  const handleSampleDelete = useCallback(
    /**
     * @param {string | string[]} id
     * @param {boolean} [noPersist]
     */
    (id, noPersist) => {
      const ids = id instanceof Array ? id : [id];
      const userSamples = userSamplesRef.current;
      // if we are focused on the sample we are deleting, try to move the
      // focus to the next newer sample, or else the next sample after.
      if (
        focusedSampleIdRef.current &&
        ids.includes(focusedSampleIdRef.current)
      ) {
        const userSamplesList = [...userSamples.values()];
        const focusedSampleIndex = userSamplesList.findIndex(
          (s) => s.id === focusedSampleIdRef.current
        );
        const nextNewerAvailableSample = userSamplesList
          .slice(0, focusedSampleIndex)
          .reverse()
          .find((s) => !ids.includes(s.id));
        const nextFocusedSample = nextNewerAvailableSample
          ? nextNewerAvailableSample
          : // if there is no newer sample left then try to find the next after
            userSamplesList
              .slice(focusedSampleIndex + 1)
              .find((s) => !ids.includes(s.id));
        setFocusedSampleId(nextFocusedSample ? nextFocusedSample.id : null);
      }
      if (!noPersist) {
        Promise.all(
          ids.map(async (idToDelete) => {
            const sample = userSamples.get(idToDelete);
            if (sample && sample instanceof SampleContainer.Mutable) {
              await sample.remove();
            }
          })
        ).then(() => sendTabUpdateEvent('sample', ids, 'delete'));
        Promise.all(
          ids.map(async (idToDelete) => {
            const sampleCache = userSampleCachesRef.current.get(idToDelete);
            if (sampleCache && sampleCache instanceof SampleCache.Mutable) {
              await sampleCache.remove();
            }
          })
          // Maybe we don't really need to send this event because they will
          // already be deleted with the earlier event... but just for
          // consistency we'll keep it for now.
        ).then(() => sendTabUpdateEvent('cache', ids, 'delete'));
      }
      setUserSamples((samples) => {
        const newSamples = new Map(samples);
        for (const id of ids) {
          newSamples.delete(id);
        }
        return newSamples;
      });
      setUserSampleCaches((caches) => {
        const newCaches = new Map(caches);
        for (const id of ids) {
          newCaches.delete(id);
        }
        return newCaches;
      });
    },
    []
  );

  const handleRegenerateSampleCache = useCallback(
    /** @param {string} sampleId */
    (sampleId) => {
      const sampleContainer = userSamplesRef.current.get(sampleId);
      if (!sampleContainer) return;
      SampleCache.importToStorage(sampleContainer).then((sampleCache) => {
        setUserSampleCaches((sampleCaches) =>
          new Map(sampleCaches).set(sampleId, sampleCache)
        );
      });
    },
    []
  );

  useEffect(() => {
    return onTabUpdateEvent('sample', async (event) => {
      if (event.action === 'delete') {
        handleSampleDelete(event.ids, true);
      } else {
        const syncedSamples = await SampleContainer.getByIdsFromStorage(
          event.ids
        );
        setUserSamples((samples) => {
          const newSamples = new Map([
            ...samples,
            ...syncedSamples.map(
              (s) => /** @type {[string, SampleContainer]} */ ([s.id, s])
            ),
          ]);
          return new Map(
            [...newSamples].sort(([, a], [, b]) =>
              sampleContainerDateCompare(a, b)
            )
          );
        });
      }
    });
  }, [handleSampleDelete]);

  useEffect(() => {
    return onTabUpdateEvent('cache', async (event) => {
      if (event.action === 'delete') {
        setUserSampleCaches((caches) => {
          const newCaches = new Map(caches);
          for (const id of event.ids) {
            newCaches.delete(id);
          }
          return newCaches;
        });
      } else {
        const syncedCachedInfos =
          await SampleCache.getCachedInfoByIdsFromStorage(event.ids);
        // request animation frame to make sure userSamples ref is updated
        // with previous sample event
        requestAnimationFrame(() => {
          setUserSampleCaches((caches) => {
            const userSamples = userSamplesRef.current;
            if (!userSamples) return caches;
            return new Map([
              ...caches,
              ...syncedCachedInfos.map(
                (cachedInfo, i) =>
                  /** @type {[string, SampleCache]} */ ([
                    event.ids[i],
                    new SampleCache.Mutable({
                      cachedInfo,
                      // we assume the sample event was processed first
                      sampleContainer: /** @type {SampleContainer} */ (
                        userSamples.get(event.ids[i])
                      ),
                    }),
                  ])
              ),
            ]);
          });
        });
      }
    });
  }, []);

  const [selectedMobilePage, setSelectedMobilePage] = useState(
    /** @type {'sampleList' | 'currentSample' | 'about'} */ ('currentSample')
  );

  const handleSampleSelect = useCallback(
    /**
     * @param {string | null} sampleId
     */
    (sampleId) => {
      setFocusedSampleId(sampleId);
      setSelectedMobilePage('currentSample');
    },
    []
  );

  const handleHeaderClick = useCallback(() => {
    setFocusedSampleId(null);
    setSelectedMobilePage('currentSample');
  }, []);

  const sample = focusedSampleId ? allSamples.get(focusedSampleId) : null;
  const sampleCache =
    (sample &&
      (userSampleCaches.get(sample.id) ||
        factorySampleCaches.get(sample.id))) ||
    null;

  const [isPluginManagerOpen, setIsPluginManagerOpen] = useState(false);
  const openPluginManager = useCallback(() => setIsPluginManagerOpen(true), []);
  const closePluginManager = useCallback(
    () => setIsPluginManagerOpen(false),
    []
  );

  const [pluginParamsDefs, setPluginParamsDefs] = useState(
    /** @type {Awaited<ReturnType<typeof listPluginParams>>} */ (new Map())
  );
  const updatePluginParamsDefs = useCallback(async () => {
    const pluginParamDefs = await listPluginParams();
    setPluginParamsDefs(pluginParamDefs);
  }, []);
  useEffect(() => {
    updatePluginParamsDefs();
    return onTabUpdateEvent('plugin', updatePluginParamsDefs);
  }, [updatePluginParamsDefs]);

  const pluginNameList = useMemo(
    () => [...pluginParamsDefs.keys()],
    [pluginParamsDefs]
  );

  const [pluginStatusMap, setPluginStatusMap] = useState(
    /** @type {Map<string, import('./pluginStore').PluginStatus>} */ (new Map())
  );
  useEffect(() => {
    /** @type {typeof pluginStatusMap} */
    const newStatusMap = new Map();
    let cancelled = false;
    getPluginStatus(...pluginNameList).then((statuses) => {
      if (cancelled) return;
      pluginNameList.forEach((pluginName, i) => {
        newStatusMap.set(pluginName, statuses[i]);
      });
      setPluginStatusMap(newStatusMap);
    });
    const pluginErrorUnsubscribeCallbacks = pluginNameList.map((pluginName) =>
      getPlugin(pluginName).onPluginError(() =>
        setPluginStatusMap((pluginStatusMap) =>
          new Map(pluginStatusMap).set(pluginName, 'broken')
        )
      )
    );
    return () => {
      cancelled = true;
      for (const callback of pluginErrorUnsubscribeCallbacks) {
        callback();
      }
    };
  }, [pluginNameList]);

  return (
    <div className={classes.app}>
      <Header onHeaderClick={handleHeaderClick} />
      <div
        className={`${classes.mobileLayoutContainer} ${classes[selectedMobilePage]}`}
      >
        <div className={classes.sampleListSidebar}>
          <SampleMenu
            loading={loadingSamples}
            focusedSampleId={focusedSampleId}
            userSamples={userSamples}
            factorySamples={factorySamples}
            userSampleCaches={userSampleCaches}
            factorySampleCaches={factorySampleCaches}
            onSampleSelect={handleSampleSelect}
            onSampleDelete={handleSampleDelete}
          />
        </div>
        <div className={classes.mainLayout}>
          {!sample ? null : sample instanceof SampleContainer.Mutable ? (
            <SampleDetail
              sample={sample}
              sampleCache={sampleCache}
              pluginParamsDefs={pluginParamsDefs}
              pluginStatusMap={pluginStatusMap}
              onSampleUpdate={handleSampleUpdate}
              onSampleDuplicate={handleSampleDuplicate}
              onSampleDelete={handleSampleDelete}
              onOpenPluginManager={openPluginManager}
              onRecheckPlugins={updatePluginParamsDefs}
              onRegenerateSampleCache={handleRegenerateSampleCache}
            />
          ) : (
            <SampleDetailReadonly
              sample={sample}
              sampleCache={sampleCache}
              onSampleDuplicate={handleSampleDuplicate}
            />
          )}
          {!focusedSampleId && (
            <SampleRecord
              userSamples={userSamples}
              onBulkImport={handleSampleBulkAdd}
              onRecordFinish={handleRecordFinish}
            />
          )}
          {(!focusedSampleId || sample) && (
            <div className={classes.normalFooterContainer}>
              <Footer />
            </div>
          )}
        </div>
        <div className={classes.mobileFooterContainer}>
          <Container fluid="sm">
            <h2>About Volca Sampler</h2>
            <Footer />
          </Container>
        </div>
      </div>
      <Nav
        className={classes.mobilePageNav}
        activeKey={selectedMobilePage}
        variant="underline"
      >
        <Nav.Item onClick={() => setSelectedMobilePage('sampleList')}>
          <Nav.Link eventKey="sampleList">List</Nav.Link>
        </Nav.Item>
        <Nav.Item onClick={() => setSelectedMobilePage('currentSample')}>
          <Nav.Link eventKey="currentSample">Sample</Nav.Link>
        </Nav.Item>
        <Nav.Item onClick={() => setSelectedMobilePage('about')}>
          <Nav.Link eventKey="about">About</Nav.Link>
        </Nav.Item>
      </Nav>
      <PluginManager
        isOpen={isPluginManagerOpen}
        pluginList={pluginNameList}
        pluginStatusMap={pluginStatusMap}
        userSamples={userSamples}
        onUpdatePluginList={updatePluginParamsDefs}
        onSampleUpdate={handleSampleUpdate}
        onSampleBulkReplace={handleSampleBulkReplace}
        onClose={closePluginManager}
      />
    </div>
  );
}

export default App;

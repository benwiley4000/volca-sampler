import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Accordion, Button, ListGroup, Offcanvas } from 'react-bootstrap';

import Header from './Header.js';
import SampleList from './SampleList.js';
import SampleDetail from './SampleDetail.js';
import SampleDetailReadonly from './SampleDetailReadonly.js';
import SampleRecord from './SampleRecord.js';
import {
  getFactorySamples,
  SampleContainer,
  storeAudioSourceFile,
} from './store.js';
import { getSamplePeaksForAudioBuffer } from './utils/waveform.js';
import { getAudioBufferForAudioFileData } from './utils/audioData.js';
import { newSampleName } from './utils/words.js';

import classes from './App.module.scss';

const sessionStorageKey = 'focused_sample_id';

function App() {
  const [userSamples, setUserSamples] = useState(
    /** @type {Map<string, SampleContainer>} */ (new Map())
  );
  const [factorySamples, setFactorySamples] = useState(
    /** @type {Map<string, SampleContainer>} */ (new Map())
  );
  const allSamples = useMemo(() => {
    return new Map([...userSamples, ...factorySamples]);
  }, [userSamples, factorySamples]);
  useEffect(() => {
    getFactorySamples().then(setFactorySamples).catch(console.error);
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
      .then((storedSamples) => {
        setUserSamples(
          (samples) =>
            new Map([
              ...samples,
              ...storedSamples.map(
                (sample) =>
                  /** @type {[string, SampleContainer]} */ ([sample.id, sample])
              ),
            ])
        );
        // TODO: automatically set focused sample id to first.. easier with useReducer maybe
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
      trim: {
        frames: trimFrames,
        waveformPeaks,
      },
      userFileInfo: userFile && {
        type: userFile.type,
        ext: userFileExtension,
      },
    });
    await sample.persist();
    setUserSamples((samples) => new Map([[sample.id, sample], ...samples]));
    setFocusedSampleId(sample.id);
    return 'saved';
  }, []);

  /**
   * @type {(id: string, update: import('./store').SampleMetadataUpdateArg) => void}
   */
  const handleSampleUpdate = useCallback((id, updater) => {
    setUserSamples((samples) => {
      const sample = samples.get(id);
      if (sample && sample instanceof SampleContainer.Mutable) {
        const updated = sample.update(updater);
        if (updated !== sample) {
          return new Map(samples).set(sample.id, updated);
        }
      }
      return samples;
    });
  }, []);

  const allSamplesRef = useRef(allSamples);
  allSamplesRef.current = allSamples;
  const handleSampleDuplicate = useCallback(
    /**
     * @param {string} id
     */
    (id) => {
      const sample = allSamplesRef.current.get(id);
      if (sample) {
        const newSample = sample.duplicate();
        setUserSamples(
          (samples) => new Map([[newSample.id, newSample], ...samples])
        );
        // TODO: scroll new sample into view
        setFocusedSampleId(newSample.id);
      }
    },
    []
  );

  const userSamplesRef = useRef(userSamples);
  userSamplesRef.current = userSamples;
  const handleSampleDelete = useCallback(
    /**
     * @param {string} id
     */
    (id) => {
      const userSamples = userSamplesRef.current;
      const sample = userSamples.get(id);
      if (sample && sample instanceof SampleContainer.Mutable) {
        sample.remove();
        /** @type {string | null} */
        let nextFocusedSampleId = null;
        let awaitingNextBeforeBreak = false;
        for (const [, sample] of userSamples) {
          if (awaitingNextBeforeBreak) {
            nextFocusedSampleId = sample.id;
            break;
          }
          if (sample.id === id) {
            if (!nextFocusedSampleId) {
              awaitingNextBeforeBreak = true;
              continue;
            }
            break;
          }
          nextFocusedSampleId = sample.id;
        }
        setFocusedSampleId(nextFocusedSampleId);
        setUserSamples((samples) => {
          const newSamples = new Map(samples);
          newSamples.delete(sample.id);
          return newSamples;
        });
      }
    },
    []
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleSampleSelect = useCallback(
    /**
     * @param {string | null} sampleId
     */
    (sampleId) => {
      setFocusedSampleId(sampleId);
      setSidebarOpen(false);
    },
    []
  );

  const handleMenuOpen = useCallback(() => setSidebarOpen(true), []);
  const handleHeaderClick = useCallback(() => setFocusedSampleId(null), []);

  return (
    <div>
      <Header onMenuOpen={handleMenuOpen} onHeaderClick={handleHeaderClick} />
      <Offcanvas
        className={classes.sidebar}
        show={sidebarOpen}
        onHide={() => setSidebarOpen(false)}
      >
        <Offcanvas.Header closeButton />
        <Offcanvas.Body>
          <Button
            className={classes.newSampleButton}
            type="button"
            variant="primary"
            onClick={() => handleSampleSelect(null)}
            >
              New sample
              </Button>
          <ListGroup>
            {loadingSamples ? 'Loading...' : null}
            {!loadingSamples && (
              <Accordion
                defaultActiveKey={
                  focusedSampleId && factorySamples.has(focusedSampleId)
                    ? 'factory'
                    : userSamples.size
                    ? 'user'
                    : 'factory'
                }
              >
                <Accordion.Item eventKey="user">
                  <Accordion.Header>Your Samples</Accordion.Header>
                  <Accordion.Body style={{ padding: 0 }}>
                    <SampleList
                      samples={userSamples}
                      selectedSampleId={focusedSampleId}
                      onSampleSelect={handleSampleSelect}
                    />
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="factory">
                  <Accordion.Header>Factory Samples</Accordion.Header>
                  <Accordion.Body style={{ padding: 0 }}>
                    <SampleList
                      samples={factorySamples}
                      selectedSampleId={focusedSampleId}
                      onSampleSelect={handleSampleSelect}
                    />
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}
          </ListGroup>
        </Offcanvas.Body>
      </Offcanvas>
      <div className={classes.mainLayout}>
        <div className={classes.focusedSampleContainer}>
          {focusedSampleId &&
            (() => {
              const sample = allSamples.get(focusedSampleId) || null;
              if (!sample) {
                return null;
              }
              if (sample instanceof SampleContainer.Mutable) {
                return (
                  <SampleDetail
                    sample={sample}
                    onSampleUpdate={handleSampleUpdate}
                    onSampleDuplicate={handleSampleDuplicate}
                    onSampleDelete={handleSampleDelete}
                  />
                );
              }
              return (
                <SampleDetailReadonly
                  sample={sample}
                  onSampleDuplicate={handleSampleDuplicate}
                />
              );
            })()}
          {!focusedSampleId && (
            <SampleRecord onRecordFinish={handleRecordFinish} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

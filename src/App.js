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
import {
  getFactorySamples,
  SampleContainer,
  storeAudioSourceFile,
} from './store.js';
import { getSamplePeaksForAudioBuffer } from './utils/waveform.js';
import { getAudioBufferForAudioFileData } from './utils/audioData.js';
import { newSampleName } from './utils/words.js';
import {
  onSampleUpdateEvent,
  sendSampleUpdateEvent,
} from './utils/sampleTabSync.js';

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
    Promise.resolve().then(() => sendSampleUpdateEvent(sample.id, 'create'));
    return 'saved';
  }, []);

  /**
   * @type {(id: string, update: import('./store').SampleMetadataUpdateArg) => void}
   */
  const handleSampleUpdate = useCallback((id, updater) => {
    setUserSamples((samples) => {
      const sample = samples.get(id);
      if (sample && sample instanceof SampleContainer.Mutable) {
        const updated = sample.update(updater, () => {
          sendSampleUpdateEvent(sample.id, 'edit');
        });
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
        const newSample = sample.duplicate((id) => {
          sendSampleUpdateEvent(id, 'create');
        });
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
     * @param {boolean} [noPersist]
     */
    (id, noPersist) => {
      const userSamples = userSamplesRef.current;
      const sample = userSamples.get(id);
      if (sample && sample instanceof SampleContainer.Mutable) {
        if (!noPersist) {
          sample.remove().then(() => {
            sendSampleUpdateEvent(sample.id, 'delete');
          });
        }
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

  useEffect(() => {
    return onSampleUpdateEvent(async (event) => {
      if (event.action === 'delete') {
        handleSampleDelete(event.sampleId, true);
      } else {
        const syncedSample = await SampleContainer.getOneFromStorage(
          event.sampleId
        );
        setUserSamples((samples) =>
          new Map(samples).set(syncedSample.id, syncedSample)
        );
      }
    });
  }, [handleSampleDelete]);

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
            onSampleSelect={handleSampleSelect}
          />
        </div>
        <div className={classes.mainLayout}>
          {!sample ? null : sample instanceof SampleContainer.Mutable ? (
            <SampleDetail
              sample={sample}
              onSampleUpdate={handleSampleUpdate}
              onSampleDuplicate={handleSampleDuplicate}
              onSampleDelete={handleSampleDelete}
            />
          ) : (
            <SampleDetailReadonly
              sample={sample}
              onSampleDuplicate={handleSampleDuplicate}
            />
          )}
          {!focusedSampleId && (
            <SampleRecord onRecordFinish={handleRecordFinish} />
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
    </div>
  );
}

export default App;

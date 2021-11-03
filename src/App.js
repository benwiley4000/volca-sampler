import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from 'tonami';

import Header from './Header.js';
import SampleList from './SampleList.js';
import SampleDetail from './SampleDetail.js';
import SampleRecord from './SampleRecord.js';
import {
  getFactorySamples,
  SampleContainer,
  storeAudioSourceFile,
} from './store.js';
import { getSamplePeaksForSourceFile } from './utils/waveform.js';
import { Accordion, ListGroup, Offcanvas } from 'react-bootstrap';

const MainLayout = styled.div({
  padding: '2rem',
  display: 'flex',
  height: '100%',
});

const FocusedSampleContainer = styled.div({
  flexGrow: 1,
});

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
  const [focusedSampleId, setFocusedSampleId] = useState(
    /** @type {string | null} */ (null)
  );
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
   * @type {(audioFileBuffer: Uint8Array, userFile?: File) => void}
   * */
  const handleRecordFinish = useCallback(async (audioFileBuffer, userFile) => {
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
      name = 'New sample';
    }
    /**
     * @type {[number, number]}
     */
    const trimFrames = [0, 0];
    const waveformPeaks = await getSamplePeaksForSourceFile(
      sourceFileId,
      trimFrames
    );
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
  }, []);

  const handleSampleUpdate = useCallback((id, update) => {
    setUserSamples((samples) => {
      const sample = samples.get(id);
      if (sample && sample instanceof SampleContainer.Mutable) {
        const updated = sample.update(
          typeof update === 'function' ? update(sample.metadata) : update
        );
        if (updated !== sample) {
          return new Map(samples).set(sample.id, updated);
        }
      }
      return samples;
    });
  }, []);

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

  return (
    <div>
      <Header
        onMenuOpen={() => setSidebarOpen(true)}
        onHeaderClick={() => setFocusedSampleId(null)}
      />
      <Offcanvas show={sidebarOpen} onHide={() => setSidebarOpen(false)}>
        <Offcanvas.Header closeButton />
        <Offcanvas.Body>
          <ListGroup>
            <ListGroup.Item
              as="button"
              onClick={() => handleSampleSelect(null)}
            >
              New Sample
            </ListGroup.Item>
            {loadingSamples ? 'Loading...' : null}
            {!loadingSamples && (
              <Accordion
                defaultActiveKey={userSamples.size ? 'user' : 'factory'}
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
      <MainLayout>
        <FocusedSampleContainer>
          {focusedSampleId && (
            <SampleDetail
              sample={allSamples.get(focusedSampleId) || null}
              onSampleUpdate={handleSampleUpdate}
              onSampleDuplicate={(id) => {
                const sample = allSamples.get(id);
                if (sample) {
                  const newSample = sample.duplicate();
                  setUserSamples(
                    (samples) =>
                      new Map([[newSample.id, newSample], ...samples])
                  );
                  // TODO: scroll new sample into view
                  setFocusedSampleId(newSample.id);
                }
              }}
              onSampleDelete={(id) => {
                const sample = allSamples.get(id);
                if (sample && sample instanceof SampleContainer.Mutable) {
                  sample.remove();
                  setUserSamples((samples) => {
                    const newSamples = new Map(samples);
                    newSamples.delete(sample.id);
                    return newSamples;
                  });
                }
              }}
            />
          )}
          {!focusedSampleId && (
            <SampleRecord onRecordFinish={handleRecordFinish} />
          )}
        </FocusedSampleContainer>
      </MainLayout>
    </div>
  );
}

export default App;

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

const MainLayout = styled.div({
  padding: '2rem',
  display: 'flex',
  height: '100%',
});

const SampleListContainer = styled.div({
  width: '300px',
  flexShrink: 0,
  paddingRight: '0.5rem',
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
      name = 'New one';
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
        const updated = sample.update(update);
        if (updated !== sample) {
          return new Map(samples).set(sample.id, updated);
        }
      }
      return samples;
    });
  }, []);

  return (
    <div>
      <Header />
      <MainLayout>
        <SampleListContainer>
          {loadingSamples ? 'Loading...' : null}
          {!loadingSamples && (
            <>
              <button onClick={() => setFocusedSampleId(null)}>
                New Sample
              </button>
              {[userSamples, factorySamples].map((sampleBank, i) => (
                <React.Fragment key={i}>
                  <h3>
                    {sampleBank === userSamples
                      ? 'Your Samples'
                      : 'Factory Samples'}
                  </h3>
                  <SampleList
                    samples={sampleBank}
                    selectedSampleId={focusedSampleId}
                    onSampleSelect={setFocusedSampleId}
                  />
                </React.Fragment>
              ))}
            </>
          )}
        </SampleListContainer>
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

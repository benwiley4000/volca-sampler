import React, { useCallback, useEffect, useState } from 'react';
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
  const [showingFactorySamples, setShowingFactorySamples] = useState(false);
  const [samples, setSamples] = useState(
    /** @type {Map<string, SampleContainer>} */ (new Map())
  );
  const [factorySamples, setFactorySamples] = useState(
    /** @type {Map<string, SampleContainer>} */ (new Map())
  );
  useEffect(() => {
    getFactorySamples().then(setFactorySamples).catch(console.error);
  }, []);
  const [focusedSampleId, setFocusedSampleId] = useState(
    /** @type {string | null} */ (null)
  );
  const [loadingSamples, setLoadingSamples] = useState(true);
  const selectedSampleBank = showingFactorySamples ? factorySamples : samples;
  useEffect(() => {
    // TODO: error handling
    SampleContainer.getAllFromStorage()
      .then((storedSamples) => {
        setSamples(
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
  useEffect(() => {
    setFocusedSampleId((focusedSampleId) => {
      if (focusedSampleId && selectedSampleBank.has(focusedSampleId)) {
        return focusedSampleId;
      }
      if (!selectedSampleBank.size) {
        return null;
      }
      return [...selectedSampleBank.values()][0].id;
    });
  }, [selectedSampleBank]);

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
    setSamples((samples) => new Map([[sample.id, sample], ...samples]));
    setShowingFactorySamples(false);
    setFocusedSampleId(sample.id);
  }, []);

  const handleSampleUpdate = useCallback((id, update) => {
    setSamples((samples) => {
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
        <select
          value={JSON.stringify(showingFactorySamples)}
          onChange={(e) => setShowingFactorySamples(JSON.parse(e.target.value))}
        >
          <option value="false">Your Samples</option>
          <option value="true">Factory Samples</option>
        </select>
        <SampleListContainer>
          {loadingSamples ? 'Loading...' : null}
          <SampleList
            samples={selectedSampleBank}
            selectedSampleId={focusedSampleId}
            onNewSample={() => setFocusedSampleId(null)}
            onSampleSelect={(id) => {
              setFocusedSampleId(id);
            }}
          />
        </SampleListContainer>
        <FocusedSampleContainer>
          {focusedSampleId && (
            <SampleDetail
              sample={selectedSampleBank.get(focusedSampleId) || null}
              onSampleUpdate={handleSampleUpdate}
              onSampleDuplicate={(id) => {
                const sample = selectedSampleBank.get(id);
                if (sample) {
                  const newSample = sample.duplicate();
                  setSamples(
                    (samples) =>
                      new Map([[newSample.id, newSample], ...samples])
                  );
                  setShowingFactorySamples(false);
                  // TODO: scroll new sample into view
                  setFocusedSampleId(newSample.id);
                }
              }}
              onSampleDelete={(id) => {
                const sample = selectedSampleBank.get(id);
                if (sample && sample instanceof SampleContainer.Mutable) {
                  sample.remove();
                  setSamples((samples) => {
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

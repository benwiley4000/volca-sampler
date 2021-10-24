import React, { useCallback, useEffect, useState } from 'react';
import { styled } from 'tonami';

import SampleList from './SampleList.js';
import SampleDetail from './SampleDetail.js';
import SampleRecord from './SampleRecord.js';
import {
  getFactorySamples,
  SampleContainer,
  storeAudioSourceFile,
} from './store.js';
import { getSamplePeaksForSourceFile } from './utils/waveform.js';

const Title = styled.h1({
  display: 'flex',
  alignItems: 'center',
  padding: '2rem',
  paddingBottom: '0px',
  marginBottom: '0px',
});

const TitleText = styled.span({
  color: 'red',
});

const TitleR = styled.span({
  textTransform: 'uppercase',
  textDecoration: 'underline',
});

const TitleGraphic = styled.img({
  height: '1.6em',
  paddingLeft: '1rem',
});

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
  const [captureState, setCaptureState] = useState(
    /** @type {import('./SampleRecord').CaptureState} */ ('idle')
  );
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
    if (
      selectedSampleBank.size &&
      !(focusedSampleId && selectedSampleBank.has(focusedSampleId))
    ) {
      setFocusedSampleId([...selectedSampleBank.values()][0].id);
    }
  }, [selectedSampleBank, focusedSampleId]);

  const handleRecordStart = useCallback(() => setCaptureState('capturing'), []);

  /**
   * @type {(audioFileBuffer: Uint8Array, userFile?: File) => void}
   * */
  const handleRecordFinish = useCallback(async (audioFileBuffer, userFile) => {
    setCaptureState('preparing');
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
    const waveformPeaks = await getSamplePeaksForSourceFile(sourceFileId, trimFrames);
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
    setCaptureState('idle');
  }, []);

  /**
   * @type {(err: unknown) => void}
   * */
  const handleRecordError = useCallback((err) => {
    console.error(err);
    setCaptureState('error');
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
      <Title>
        <TitleText>
          Volca Sample
          <TitleR>r</TitleR>
        </TitleText>
        <TitleGraphic src="volca_sample.png" alt="" />
      </Title>
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
            selectedSampleId={captureState === 'idle' ? focusedSampleId : null}
            readonly={['capturing', 'preparing'].includes(captureState)}
            onNewSample={() => setCaptureState('ready')}
            onSampleSelect={(id) => {
              setFocusedSampleId(id);
              setCaptureState('idle');
            }}
          />
        </SampleListContainer>
        <FocusedSampleContainer>
          {captureState === 'idle' && (
            <SampleDetail
              sample={
                (focusedSampleId && selectedSampleBank.get(focusedSampleId)) ||
                null
              }
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
          {captureState !== 'idle' && (
            <SampleRecord
              captureState={captureState}
              onRecordStart={handleRecordStart}
              onRecordFinish={handleRecordFinish}
              onRecordError={handleRecordError}
            />
          )}
        </FocusedSampleContainer>
      </MainLayout>
    </div>
  );
}

export default App;

import React, { useCallback, useEffect, useState } from 'react';

import SampleList from './SampleList';
import SampleDetail from './SampleDetail';
import SampleRecord from './SampleRecord';
import { factorySamples, SampleContainer, storeAudioSourceFile } from './store';

{
  const css = `
.volcaSampler {
  padding: 2rem;
  display: flex;
  height: 100%;
}

.sampleListContainer {
  width: 200px;
  flex-shrink: 0;
  padding-right: 0.5rem;
  height: 100%;
}

.focusedSampleContainer {
  flex-grow: 1;
}

.focusedSample {
  padding-left: 2rem;
}
  `;
  const style = document.createElement('style');
  style.innerHTML = css;
  document.body.appendChild(style);
}
/**
 * @type {Record<string, string>}
 */
const classes = [
  'volcaSampler',
  'sampleListContainer',
  'sampleList',
  'sampleListItem',
  'focusedSampleContainer',
  'focusedSample',
].reduce((classes, className) => ({ ...classes, [className]: className }), {});

function App() {
  const [showingFactorySamples, setShowingFactorySamples] = useState(false);
  const [samples, setSamples] = useState(
    /** @type {Map<string, SampleContainer>} */ (new Map())
  );
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
    const sample = new SampleContainer.Mutable({
      name,
      sourceFileId,
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
        return new Map(samples).set(sample.id, sample.update(update));
      }
      return samples;
    });
  }, []);

  return (
    <div className={classes.volcaSampler}>
      <select
        value={JSON.stringify(showingFactorySamples)}
        onChange={(e) => setShowingFactorySamples(JSON.parse(e.target.value))}
      >
        <option value="false">Your Samples</option>
        <option value="true">Factory Samples</option>
      </select>
      <div className={classes.sampleListContainer}>
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
      </div>
      <div className={classes.focusedSampleContainer}>
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
                  (samples) => new Map([[newSample.id, newSample], ...samples])
                );
                setShowingFactorySamples(false);
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
        <SampleRecord
          captureState={captureState}
          onRecordStart={handleRecordStart}
          onRecordFinish={handleRecordFinish}
          onRecordError={handleRecordError}
        />
      </div>
    </div>
  );
}

export default App;

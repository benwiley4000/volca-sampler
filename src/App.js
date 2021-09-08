import React, { useCallback, useEffect, useState } from 'react';

import SampleList from './SampleList';
import SampleDetail from './SampleDetail';
import SampleRecord from './SampleRecord';
import { SampleContainer, storeWavSourceFile } from './store';

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
    if (samples.size && !(focusedSampleId && samples.has(focusedSampleId))) {
      setFocusedSampleId([...samples.values()][0].id);
    }
  }, [samples, focusedSampleId]);

  const handleRecordStart = useCallback(() => setCaptureState('capturing'), []);

  /**
   * @type {(wavBuffer: Uint8Array) => void}
   * */
  const handleRecordFinish = useCallback(async (wavBuffer) => {
    setCaptureState('preparing');
    const id = await storeWavSourceFile(wavBuffer);
    const sample = new SampleContainer({
      name: 'New one',
      sourceFileId: id,
    });
    await sample.persist();
    setSamples((samples) => new Map([[sample.id, sample], ...samples]));
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

  return (
    <div className={classes.volcaSampler}>
      <div className={classes.sampleListContainer}>
        <SampleList
          samples={samples}
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
            sample={(focusedSampleId && samples.get(focusedSampleId)) || null}
            onSampleUpdate={(id, update) => {
              const sample = samples.get(id);
              if (sample) {
                setSamples((samples) =>
                  new Map(samples).set(sample.id, sample.update(update))
                );
              }
            }}
            onSampleDuplicate={(id) => {
              const sample = samples.get(id);
              if (sample) {
                const newSample = sample.duplicate();
                setSamples(
                  (samples) => new Map([[newSample.id, newSample], ...samples])
                );
              }
            }}
            onSampleDelete={(id) => {
              const sample = samples.get(id);
              if (sample) {
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

import React, { useEffect, useMemo, useState } from 'react';
import { Container, Button, Alert } from 'react-bootstrap';

import WaveformReadonly from './WaveformReadonly.js';
import VolcaTransferControl from './VolcaTransferControl.js';
import { SampleContainer } from './store.js';
import { formatDate } from './utils/datetime.js';

import classes from './SampleDetail.module.scss';

/**
 * @param {import('./store').SampleContainer} readonlySample
 */
function useSampleWithTemporalSlotNumber(readonlySample) {
  const readonlySlotNumber = readonlySample.metadata.slotNumber;
  const [slotNumber, setSlotNumber] = useState(readonlySlotNumber);
  useEffect(() => {
    setSlotNumber(readonlySlotNumber);
  }, [readonlySlotNumber]);
  const sample = useMemo(
    () =>
      readonlySample &&
      new SampleContainer({
        id: readonlySample.id,
        ...readonlySample.metadata,
        slotNumber,
      }),
    [readonlySample, slotNumber]
  );
  return { sample, setSlotNumber };
}

/**
 * @param {{
 *   sample: import('./store').SampleContainer;
 *   sampleCache: import('./sampleCacheStore.js').SampleCache | null;
 *   onSampleDuplicate: (id: string) => void;
 * }} props
 */
function SampleDetailReadonly({
  sample: readonlySample,
  sampleCache,
  onSampleDuplicate,
}) {
  const { sample, setSlotNumber } =
    useSampleWithTemporalSlotNumber(readonlySample);
  const sampleCaches = useMemo(
    () =>
      sampleCache
        ? new Map().set(sampleCache.sampleContainer.id, sampleCache)
        : new Map(),
    [sampleCache]
  );
  return (
    <Container fluid="sm">
      <h2 className={classes.sampleName}>{sample.metadata.name}</h2>
      <p>
        <strong>Sampled:</strong>{' '}
        {formatDate(new Date(sample.metadata.dateSampled))}
      </p>
      <Alert variant="secondary">
        <Alert.Heading>This is a factory sample.</Alert.Heading>
        <p>
          If you want to trim the audio, adjust quality, change the pitch or use
          plugins before transferring to the volca sample,{' '}
          <span className={classes.buttonLink}>
            <Button variant="link" onClick={() => onSampleDuplicate(sample.id)}>
              make a duplicate
            </Button>
            .
          </span>
        </p>
      </Alert>
      <h4>Preview</h4>
      <WaveformReadonly sample={sample} sampleCache={sampleCache} />
      <h4>Transfer</h4>
      <VolcaTransferControl
        samples={sample}
        sampleCaches={sampleCaches}
        onSlotNumberUpdate={setSlotNumber}
      />
    </Container>
  );
}

export default SampleDetailReadonly;

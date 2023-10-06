import { getSyroBindings } from './getSyroBindings.js';
import { getTargetWavForSample } from './audioData.js';

/**
 * @param {import('../store').SampleContainer} sampleContainer
 * @param {(progress: number) => void} onProgress
 * @returns {{
 *   syroBufferPromise: Promise<{ syroBuffer: Uint8Array; dataSize: number }>;
 *   cancelWork: () => void;
 * }}
 */
export function getSyroBuffer(sampleContainer, onProgress) {
  let cancelled = false;
  let onCancel = () => {};
  return {
    cancelWork() {
      cancelled = true;
      onCancel();
    },
    syroBufferPromise: (async () => {
      const {
        allocateSyroData,
        createSyroDataFromWavData,
        prepareSampleBufferFromSyroData,
        getSampleBufferChunkPointer,
        getSampleBufferChunkSize,
        getSampleBufferProgress,
        getSampleBufferTotalSize,
        cancelSampleBufferWork,
        registerUpdateCallback,
        unregisterUpdateCallback,
        heap8Buffer,
      } = await getSyroBindings();
      const emptyResponse = {
        syroBuffer: new Uint8Array(),
        dataSize: 0,
      };
      if (cancelled) {
        return emptyResponse;
      }
      const { data } = await getTargetWavForSample(sampleContainer);
      if (cancelled) {
        return emptyResponse;
      }
      /**
       * @type {Uint8Array | undefined}
       */
      let syroBuffer;
      let progress = 0;
      const onUpdate = registerUpdateCallback((sampleBufferUpdatePointer) => {
        if (cancelled) {
          return;
        }
        const totalSize = getSampleBufferTotalSize(sampleBufferUpdatePointer);
        if (!syroBuffer) {
          syroBuffer = new Uint8Array(totalSize);
        }
        const chunkPointer = getSampleBufferChunkPointer(
          sampleBufferUpdatePointer
        );
        const chunkSize = getSampleBufferChunkSize(sampleBufferUpdatePointer);
        const bytesProgress = getSampleBufferProgress(
          sampleBufferUpdatePointer
        );
        // save a new copy of the data so it doesn't disappear
        syroBuffer.set(
          new Uint8Array(heap8Buffer(), chunkPointer, chunkSize),
          bytesProgress - chunkSize
        );
        progress = bytesProgress / totalSize;
      });
      const numberOfSamples = 1;
      const syroDataHandle = allocateSyroData(numberOfSamples);
      const samples = [{ data, sampleContainer }];
      samples.forEach(({ data, sampleContainer }, i) => {
        createSyroDataFromWavData(
          syroDataHandle,
          i,
          data,
          data.length,
          sampleContainer.metadata.slotNumber,
          sampleContainer.metadata.qualityBitDepth,
          sampleContainer.metadata.useCompression ? 1 : 0
        );
      });
      const workHandle = prepareSampleBufferFromSyroData(
        syroDataHandle,
        numberOfSamples,
        onUpdate
      );
      onProgress(progress);
      try {
        await /** @type {Promise<void>} */ (
          new Promise((resolve) => {
            /**
             * @type {number}
             */
            let frame;
            onCancel = () => {
              cancelAnimationFrame(frame);
              cancelSampleBufferWork(workHandle);
              resolve();
            };
            checkProgress();
            function checkProgress() {
              // TODO: find a way to detect if the web worker failed to load, in
              // which case we should reject the promise
              if (progress) {
                onProgress(progress);
                if (progress >= 1) {
                  resolve();
                  return;
                }
              }
              frame = requestAnimationFrame(checkProgress);
            }
          })
        );
      } finally {
        onCancel = () => {};
        unregisterUpdateCallback(onUpdate);
      }
      if (cancelled) {
        return emptyResponse;
      }
      if (!syroBuffer) {
        throw new Error('Unexpected condition: syroBuffer should be defined');
      }
      return {
        syroBuffer,
        dataSize: data.length,
      };
    })(),
  };
}

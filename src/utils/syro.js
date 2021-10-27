import { getSyroBindings } from './getSyroBindings.js';
import { getTargetWavForSample } from './audioData.js';

/**
 * @param {import('../store').SampleContainer} sampleContainer
 * @param {(progress: number) => void} onProgress
 * @returns {{
 *   sampleBufferPromise: Promise<Uint8Array>;
 *   cancelWork: () => void;
 * }}
 */
export function getSampleBuffer(sampleContainer, onProgress) {
  let cancelled = false;
  let onCancel = () => {};
  return {
    cancelWork() {
      cancelled = true;
      onCancel();
    },
    sampleBufferPromise: (async () => {
      const {
        prepareSampleBufferFromWavData,
        getSampleBufferPointer,
        getSampleBufferSize,
        getSampleBufferProgress,
        cancelSampleBufferWork,
        registerUpdateCallback,
        unregisterUpdateCallback,
        heap8Buffer,
      } = await getSyroBindings();
      if (cancelled) {
        return new Uint8Array();
      }
      const { data } = await getTargetWavForSample(sampleContainer);
      if (cancelled) {
        return new Uint8Array();
      }
      /**
       * @type {Uint8Array | undefined}
       */
      let sampleBuffer;
      let progress = 0;
      const onUpdate = registerUpdateCallback(
        (sampleBufferContainerPointer) => {
          if (cancelled) {
            return;
          }
          const bufferPointer = getSampleBufferPointer(
            sampleBufferContainerPointer
          );
          const bufferSize = getSampleBufferSize(sampleBufferContainerPointer);
          if (!sampleBuffer) {
            sampleBuffer = new Uint8Array(bufferSize);
          }
          // save a new copy of the data so it doesn't disappear
          sampleBuffer.set(
            new Uint8Array(heap8Buffer(), bufferPointer, bufferSize)
          );
          progress =
            getSampleBufferProgress(sampleBufferContainerPointer) / bufferSize;
        }
      );
      const workHandle = prepareSampleBufferFromWavData(
        data,
        data.length,
        sampleContainer.metadata.slotNumber,
        sampleContainer.metadata.qualityBitDepth,
        sampleContainer.metadata.useCompression ? 1 : 0,
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
        return new Uint8Array();
      }
      if (!sampleBuffer) {
        throw new Error('Unexpected condition: sampleBuffer should be defined');
      }
      return sampleBuffer;
    })(),
  };
}

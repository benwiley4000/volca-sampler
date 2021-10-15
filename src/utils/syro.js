import { getSyroBindings } from './getSyroBindings.js';
import { getTargetWavForSample } from './audioData.js';

/**
 * @param {import('../store').SampleContainer} sampleContainer
 * @param {(chunk: Uint8Array, sampleBufferFinalSize: number) => void} onData
 * @returns {Promise<Uint8Array>}
 */
export async function getSampleBuffer(sampleContainer, onData) {
  const {
    prepareSampleBufferFromWavData,
    getSampleBufferPointer,
    getSampleBufferSize,
    getSampleBufferProgress,
    registerUpdateCallback,
    unregisterUpdateCallback,
    heap8Buffer,
  } = await getSyroBindings();
  const { data } = await getTargetWavForSample(sampleContainer);
  /**
   * @type {Uint8Array | undefined}
   */
  let sampleBuffer;
  let progress = 0;
  /**
   * @type {(() => void) | undefined}
   */
  let onDone;
  /**
   * @type {((err: unknown) => void) | undefined}
   */
  let onError;
  const onUpdate = registerUpdateCallback((sampleBufferContainerPointer) => {
    try {
      const bufferPointer = getSampleBufferPointer(
        sampleBufferContainerPointer
      );
      const bufferSize = getSampleBufferSize(sampleBufferContainerPointer);
      const sampleBufferView = new Uint8Array(
        heap8Buffer(),
        bufferPointer,
        bufferSize
      );
      // save a new copy of the data so it doesn't disappear
      if (!sampleBuffer) {
        sampleBuffer = new Uint8Array(bufferSize);
      }
      sampleBuffer.set(sampleBufferView);
      // also call getData with the most recently loaded chunk
      const newProgress = getSampleBufferProgress(sampleBufferContainerPointer);
      onData(sampleBufferView.slice(progress, newProgress), bufferSize);
      progress = newProgress;
      if (progress >= bufferSize) {
        /** @type {NonNullable<typeof onDone>} */ (onDone)();
      }
    } catch (err) {
      /** @type {NonNullable<typeof onError>} */ (onError)(err);
    }
  });
  prepareSampleBufferFromWavData(
    data,
    data.length,
    sampleContainer.metadata.slotNumber,
    sampleContainer.metadata.qualityBitDepth,
    sampleContainer.metadata.useCompression ? 1 : 0,
    onUpdate
  );
  try {
    await /** @type {Promise<void>} */ (
      new Promise((resolve, reject) => {
        onDone = resolve;
        onError = reject;
      })
    );
  } catch (err) {
    unregisterUpdateCallback(onUpdate);
    return Promise.reject(err);
  }
  unregisterUpdateCallback(onUpdate);
  if (!sampleBuffer) {
    return Promise.reject(
      new Error('Unexpected condition: sampleBuffer should be defined')
    );
  }
  return sampleBuffer;
}

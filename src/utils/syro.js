import { getSyroBindings } from './getSyroBindings.js';
import { getTargetWavForSample } from './audioData.js';

/**
 * @param {import('../store').SampleContainer} sampleContainer
 * @param {(progress: number) => void} onProgress
 * @returns {Promise<Uint8Array>}
 */
export async function getSampleBuffer(sampleContainer, onProgress) {
  const {
    prepareSampleBufferFrom16BitPcmData,
    getSampleBufferPointer,
    getSampleBufferSize,
    getSampleBufferProgress,
    registerUpdateCallback,
    unregisterUpdateCallback,
    heap8Buffer,
  } = await getSyroBindings();
  const { data, sampleRate } = await getTargetWavForSample(sampleContainer);
  const pcmData = data.slice(44);
  /**
   * @type {Uint8Array | undefined}
   */
  let sampleBuffer;
  let progress = 0;
  const onUpdate = registerUpdateCallback((sampleBufferContainerPointer) => {
    const bufferPointer = getSampleBufferPointer(sampleBufferContainerPointer);
    const bufferSize = getSampleBufferSize(sampleBufferContainerPointer);
    if (!sampleBuffer) {
      sampleBuffer = new Uint8Array(bufferSize);
    }
    // save a new copy of the data so it doesn't disappear
    sampleBuffer.set(new Uint8Array(heap8Buffer(), bufferPointer, bufferSize));
    progress =
      getSampleBufferProgress(sampleBufferContainerPointer) / bufferSize;
  });
  prepareSampleBufferFrom16BitPcmData(
    pcmData,
    pcmData.length,
    sampleRate,
    sampleContainer.metadata.slotNumber,
    sampleContainer.metadata.qualityBitDepth,
    sampleContainer.metadata.useCompression ? 1 : 0,
    onUpdate
  );
  onProgress(progress);
  try {
    await /** @type {Promise<void>} */ (
      new Promise((resolve) => {
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
          requestAnimationFrame(checkProgress);
        }
      })
    );
  } finally {
    unregisterUpdateCallback(onUpdate);
  }
  if (!sampleBuffer) {
    throw new Error('Unexpected condition: sampleBuffer should be defined');
  }
  return sampleBuffer;
}

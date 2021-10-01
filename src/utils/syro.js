import { getSyroBindings } from './getSyroBindings';
import { getTargetWavForSample } from './audioData';

/**
 * @param {import('../store').SampleContainer} sampleContainer
 * @param {(progress: number) => void} onProgress
 * @returns {Promise<Uint8Array>}
 */
export async function getSampleBuffer(sampleContainer, onProgress) {
  const {
    startSampleBufferFrom16BitPcmData,
    iterateSampleBuffer,
    getSampleBufferPointer,
    getSampleBufferSize,
    getSampleBufferProgress,
    freeSampleBuffer,
    heap8Buffer,
  } = await getSyroBindings();
  const { data, sampleRate } = await getTargetWavForSample(sampleContainer);
  const pcmData = data.slice(44);
  const err = startSampleBufferFrom16BitPcmData(
    pcmData,
    pcmData.length,
    sampleRate,
    sampleContainer.metadata.slotNumber,
    sampleContainer.metadata.qualityBitDepth,
    sampleContainer.metadata.useCompression ? 1 : 0
  );
  if (err) {
    return Promise.reject('Failed to prepare sample buffer');
  }
  const bufferPointer = getSampleBufferPointer();
  const bufferSize = getSampleBufferSize();
  const resultView = new Uint8Array(heap8Buffer(), bufferPointer, bufferSize);
  onProgress(getSampleBufferProgress() / bufferSize);
  await /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => {
      const targetIterationTime = 10;
      // assume we're behind at the start, to avoid starting with a long frame
      let lastTime = targetIterationTime * 2;
      let lastIterationInterval = 100_000;
      requestAnimationFrame(iterate);
      function iterate() {
        if (getSampleBufferProgress() >= bufferSize) {
          resolve();
          return;
        }
        const correctionCoefficient = targetIterationTime / lastTime;
        const iterationInterval = Math.max(
          Math.round(lastIterationInterval * correctionCoefficient),
          1
        );
        const before = performance.now();
        try {
          iterateSampleBuffer(iterationInterval);
        } catch (err) {
          reject(err);
          return;
        }
        lastTime = performance.now() - before;
        if (lastTime === 0) {
          // to avoid divide-by-zero due to potential rounding in Firefox
          // https://developer.mozilla.org/en-US/docs/Web/API/Performance/now#reduced_time_precision
          lastTime = 0.5;
        }
        lastIterationInterval = iterationInterval;
        onProgress(getSampleBufferProgress() / bufferSize);
        requestAnimationFrame(iterate);
      }
    })
  );
  // save a new copy of the data before freeing the result
  const sampleBuffer = new Uint8Array(resultView);
  freeSampleBuffer();
  return sampleBuffer;
}

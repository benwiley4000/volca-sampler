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
      onData(
        new Uint8Array(sampleBuffer.buffer, progress, newProgress - progress),
        bufferSize
      );
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

/**
 * @param {import('../store').SampleContainer} sampleContainer
 * @param {(progress: number) => void} onProgress
 */
export function playSyroStreamForSampleContainer(sampleContainer, onProgress) {
  const audio = document.createElement('audio');
  const mediaSource = new MediaSource();
  audio.src = URL.createObjectURL(mediaSource);
  onProgress(0);
  mediaSource.addEventListener(
    'sourceopen',
    () => {
      let sampleBufferSize = Infinity;
      let duration = Infinity;
      let bufferProgress = 0;
      /**
       * @type {Uint8Array[]}
       */
      let chunkQueue = [];
      let firstChunkProcessed = false;
      const sourceBuffer = mediaSource.addSourceBuffer('audio/wav');
      sourceBuffer.addEventListener('updateend', () => {
        if (audio.paused) {
          audio.play();
        }
        if (bufferProgress >= sampleBufferSize) {
          mediaSource.endOfStream();
        }
      });
      function handleChunkQueue() {
        while (chunkQueue.length) {
          const chunk = chunkQueue[0];
          try {
            sourceBuffer.appendBuffer(chunk);
          } catch (err) {
            if (
              /** @type {{ name: string }} */ (err).name ===
              'QuotaExceededError'
            ) {
              break;
            } else {
              throw err;
            }
          }
          bufferProgress += chunk.length;
          chunkQueue = chunkQueue.slice(1);
        }
      }
      audio.addEventListener('timeupdate', () => {
        const { currentTime } = audio;
        onProgress(currentTime / duration);
        if (sourceBuffer.updating) {
          sourceBuffer.addEventListener('updateend', handleChunkQueue, {
            once: true,
          });
        } else {
          handleChunkQueue();
        }
      });
      audio.addEventListener('ended', () => {
        onProgress(1);
      });
      getSampleBuffer(sampleContainer, (chunk, size) => {
        if (!firstChunkProcessed) {
          sampleBufferSize = size;
          // we're assuming the first chunk will contain at least
          // 7 32-bit values, otherwise this won't work
          const sampleRate = new Int32Array(chunk.buffer)[6];
          // 2 bytes for each of two channels
          const bytesPerSample = 4;
          duration = (sampleBufferSize - 44) / (sampleRate * bytesPerSample);
        }
        chunkQueue.push(chunk);
        handleChunkQueue();
      });
    },
    { once: true }
  );
}

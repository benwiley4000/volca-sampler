// @ts-nocheck

/**
 * @typedef {{
 *   prepareSampleBufferFromWavData: (
 *     wavData: Uint8Array,
 *     bytes: number,
 *     slotNumber: number,
 *     quality: number,
 *     useCompression: 0 | 1
 *   ) => number;
 *   prepareSampleBufferFrom16BitPcmData(
 *     wavData: Uint8Array,
 *     bytes: number,
 *     rate: number,
 *     slotNumber: number,
 *     quality: number,
 *     useCompression: 0 | 1
 *   ) => number;
 *   startSampleBufferFrom16BitPcmData(
 *     wavData: Uint8Array,
 *     bytes: number,
 *     rate: number,
 *     slotNumber: number,
 *     quality: number,
 *     useCompression: 0 | 1
 *   ) => number;
 *   iterateSampleBuffer: (iterations: number) => void;
 *   getSampleBufferPointer: () => number;
 *   getSampleBufferSize: () => number;
 *   getSampleBufferProgress: () => number;
 *   freeSampleBuffer: () => void;
 *   heap8Buffer: () => ArrayBuffer;
 * }} SyroBindings
 */

/**
 * @type {Promise<SyroBindings> | undefined}
 */
let syroBindingsPromise;

export async function getSyroBindings() {
  if (typeof window.CREATE_SYRO_BINDINGS !== 'function') {
    return Promise.reject(
      'Expected CREATE_SYRO_BINDINGS global function to exist'
    );
  }
  const Module = await window.CREATE_SYRO_BINDINGS();
  return (syroBindingsPromise =
    syroBindingsPromise ||
    new Promise((resolve, reject) => {
      /**
       * @type {SyroBindings}
       */
      let syroBindings;
      try {
        syroBindings = {
          prepareSampleBufferFromWavData: Module.cwrap(
            'prepareSampleBufferFromWavData',
            'number',
            ['array', 'number', 'number', 'number']
          ),
          prepareSampleBufferFrom16BitPcmData: Module.cwrap(
            'prepareSampleBufferFrom16BitPcmData',
            'number',
            ['array', 'number', 'number', 'number', 'number']
          ),
          startSampleBufferFrom16BitPcmData: Module.cwrap(
            'startSampleBufferFrom16BitPcmData',
            'number',
            ['array', 'number', 'number', 'number', 'number']
          ),
          iterateSampleBuffer: Module.cwrap('iterateSampleBuffer', null, [
            'number',
          ]),
          getSampleBufferPointer: Module.cwrap(
            'getSampleBufferPointer',
            'number',
            []
          ),
          getSampleBufferSize: Module.cwrap(
            'getSampleBufferSize',
            'number',
            []
          ),
          getSampleBufferProgress: Module.cwrap(
            'getSampleBufferProgress',
            'number',
            []
          ),
          freeSampleBuffer: Module.cwrap('freeSampleBuffer', null, []),
          heap8Buffer() {
            return Module.HEAP8.buffer;
          },
        };
      } catch (err) {
        reject(err);
        return;
      }
      resolve(syroBindings);
    }));
}

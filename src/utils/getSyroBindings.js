/**
 * @typedef {{
 *   prepareSampleBufferFromWavData(
 *     wavData: Uint8Array,
 *     bytes: number,
 *     slotNumber: number,
 *     quality: number,
 *     useCompression: 0 | 1,
 *     onUpdate: number
 *   ): number;
 *   prepareSampleBufferFrom16BitPcmData(
 *     wavData: Uint8Array,
 *     bytes: number,
 *     rate: number,
 *     slotNumber: number,
 *     quality: number,
 *     useCompression: 0 | 1,
 *     onUpdate: number
 *   ): number;
 *   getSampleBufferChunkPointer(sampleBufferUpdate: number): number;
 *   getSampleBufferChunkSize(sampleBufferUpdate: number): number;
 *   getSampleBufferProgress(sampleBufferUpdate: number): number;
 *   getSampleBufferTotalSize(sampleBufferUpdate: number): number;
 *   cancelSampleBufferWork(workHandle: number): void;
 *   registerUpdateCallback(
 *     cb: (sampleBufferContainer: number) => void
 *   ): number;
 *   unregisterUpdateCallback(pointer: number): void;
 *   heap8Buffer(): ArrayBuffer;
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
  return (syroBindingsPromise =
    syroBindingsPromise ||
    window.CREATE_SYRO_BINDINGS().then(async (Module) => {
      /**
       * @type {SyroBindings}
       */
      const bindings = {
        prepareSampleBufferFromWavData: Module.cwrap(
          'prepareSampleBufferFromWavData',
          'number',
          ['array', 'number', 'number', 'number', 'number']
        ),
        // TODO: put this back when C function works correctly
        // prepareSampleBufferFrom16BitPcmData: Module.cwrap(
        //   'prepareSampleBufferFrom16BitPcmData',
        //   'number',
        //   ['array', 'number', 'number', 'number', 'number', 'number']
        // ),
        prepareSampleBufferFrom16BitPcmData() {
          throw new Error(
            'This function does not work. Use prepareSampleBufferFromWavData.'
          );
        },
        getSampleBufferChunkPointer: Module.cwrap(
          'getSampleBufferChunkPointer',
          'number',
          ['number']
        ),
        getSampleBufferChunkSize: Module.cwrap(
          'getSampleBufferChunkSize',
          'number',
          ['number']
        ),
        getSampleBufferProgress: Module.cwrap(
          'getSampleBufferProgress',
          'number',
          ['number']
        ),
        getSampleBufferTotalSize: Module.cwrap(
          'getSampleBufferTotalSize',
          'number',
          ['number']
        ),
        cancelSampleBufferWork: Module.cwrap('cancelSampleBufferWork', null, [
          'number',
        ]),
        registerUpdateCallback(cb) {
          return Module.addFunction(cb, 'vi');
        },
        unregisterUpdateCallback(pointer) {
          Module.removeFunction(pointer);
        },
        heap8Buffer() {
          return Module.HEAP8.buffer;
        },
      };
      return bindings;
    }));
}

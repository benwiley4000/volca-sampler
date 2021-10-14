/**
 * @typedef {{
 *   prepareSampleBufferFromWavData(
 *     wavData: Uint8Array,
 *     bytes: number,
 *     slotNumber: number,
 *     quality: number,
 *     useCompression: 0 | 1,
 *     onUpdate: number
 *   ): void;
 *   prepareSampleBufferFrom16BitPcmData(
 *     wavData: Uint8Array,
 *     bytes: number,
 *     rate: number,
 *     slotNumber: number,
 *     quality: number,
 *     useCompression: 0 | 1,
 *     onUpdate: number
 *   ): void;
 *   getSampleBufferPointer(sampleBufferContainer: number): number;
 *   getSampleBufferSize(sampleBufferContainer: number): number;
 *   getSampleBufferProgress(sampleBufferContainer: number): number;
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
            null,
            ['array', 'number', 'number', 'number', 'number']
          ),
          // TODO: put this back when C function works correctly
          // prepareSampleBufferFrom16BitPcmData: Module.cwrap(
          //   'prepareSampleBufferFrom16BitPcmData',
          //   null,
          //   ['array', 'number', 'number', 'number', 'number', 'number']
          // ),
          prepareSampleBufferFrom16BitPcmData() {
            throw new Error(
              'This function does not work. Use prepareSampleBufferFromWavData.'
            );
          },
          getSampleBufferPointer: Module.cwrap(
            'getSampleBufferPointer',
            'number',
            ['number']
          ),
          getSampleBufferSize: Module.cwrap('getSampleBufferSize', 'number', [
            'number',
          ]),
          getSampleBufferProgress: Module.cwrap(
            'getSampleBufferProgress',
            'number',
            ['number']
          ),
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
      } catch (err) {
        reject(err);
        return;
      }
      resolve(syroBindings);
    }));
}

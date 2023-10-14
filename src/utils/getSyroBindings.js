/**
 * @typedef {{
 *   allocateSyroData(numOfData: number): number;
 *   createEmptySyroData(
 *     syroDataHandle: number,
 *     syroDataIndex: number,
 *     slotNumber: number
 *   ): void;
 *   createSyroDataFromWavData(
 *     syroDataHandle: number,
 *     syroDataIndex: number,
 *     wavData: Uint8Array,
 *     bytes: number,
 *     slotNumber: number,
 *     quality: number,
 *     useCompression: 0 | 1
 *   ): void;
 *   getDeleteBufferFromSyroData(
 *     syroDataHandle: number,
 *     numOfData: number
 *   ): number;
 *   prepareSampleBufferFromSyroData(
 *     syroWorkerHandle: number,
 *     syroDataHandle: number,
 *     numOfData: number,
 *     onUpdate: number
 *   ): number;
 *   createSyroWorker(): number;
 *   destroySyroWorker(worker: number): void;
 *   getSampleBufferChunkPointer(sampleBufferUpdate: number): number;
 *   getSampleBufferChunkSize(sampleBufferUpdate: number): number;
 *   getSampleBufferProgress(sampleBufferUpdate: number): number;
 *   getSampleBufferTotalSize(sampleBufferUpdate: number): number;
 *   getSampleBufferDataStartPointsPointer(sampleBufferUpdate: number): number;
 *   freeDeleteBuffer(deleteBufferUpdate: number): void;
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
        allocateSyroData: Module.cwrap('allocateSyroData', 'number', [
          'number',
        ]),
        createEmptySyroData: Module.cwrap('createEmptySyroData', null, [
          'number',
          'number',
          'number',
        ]),
        createSyroDataFromWavData: Module.cwrap(
          'createSyroDataFromWavData',
          null,
          ['number', 'number', 'array', 'number', 'number', 'number']
        ),
        getDeleteBufferFromSyroData: Module.cwrap(
          'getDeleteBufferFromSyroData',
          'number',
          ['number', 'number']
        ),
        prepareSampleBufferFromSyroData: Module.cwrap(
          'prepareSampleBufferFromSyroData',
          'number',
          ['number', 'number', 'number', 'number']
        ),
        createSyroWorker: Module.cwrap(
          'createSyroWorker',
          'number',
          []
        ),
        destroySyroWorker: Module.cwrap(
          'destroySyroWorker',
          null,
          ['number']
        ),
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
        getSampleBufferDataStartPointsPointer: Module.cwrap(
          'getSampleBufferDataStartPointsPointer',
          'number',
          ['number']
        ),
        freeDeleteBuffer: Module.cwrap('freeDeleteBuffer', null, ['number']),
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

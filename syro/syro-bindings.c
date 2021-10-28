#include "./shared-worker-types.h"
#include "./syro-utils.c"
#include <emscripten.h>

typedef struct WorkerUpdateArg {
  worker_handle worker;
  void (*onUpdate)(SampleBufferUpdate *);
  bool secondJobStarted;
  bool cancelled;
} WorkerUpdateArg;

EMSCRIPTEN_KEEPALIVE
uint8_t *getSampleBufferChunkPointer(SampleBufferUpdate *sampleBufferUpdate) {
  return sampleBufferUpdate->chunk;
}

EMSCRIPTEN_KEEPALIVE
uint32_t getSampleBufferChunkSize(SampleBufferUpdate *sampleBufferUpdate) {
  return sampleBufferUpdate->chunkSize;
}

EMSCRIPTEN_KEEPALIVE
uint32_t getSampleBufferProgress(SampleBufferUpdate *sampleBufferUpdate) {
  return sampleBufferUpdate->progress;
}

EMSCRIPTEN_KEEPALIVE
uint32_t getSampleBufferTotalSize(SampleBufferUpdate *sampleBufferUpdate) {
  return sampleBufferUpdate->totalSize;
}

EMSCRIPTEN_KEEPALIVE
void cancelSampleBufferWork(WorkerUpdateArg *updateArg) {
  updateArg->cancelled = true;
}

void onWorkerMessage(char *data, int size, void *updateArgPointer) {
  WorkerUpdateArg *updateArg = (WorkerUpdateArg *)updateArgPointer;
  if (updateArg->cancelled) {
    emscripten_destroy_worker(updateArg->worker);
    free(updateArg);
    return;
  }
  SampleBufferUpdate *sampleBufferUpdate = (SampleBufferUpdate *)(data);
  if (size - sizeof(SampleBufferUpdate) != sampleBufferUpdate->chunkSize) {
    // TODO: error case... maybe handle it?
  }
  // We pass the actual chunk as part of the input buffer so we can replace the
  // chunk pointer with one that references memory in the main thread.
  sampleBufferUpdate->chunk = (uint8_t *)(data) + sizeof(SampleBufferUpdate);
  updateArg->onUpdate(sampleBufferUpdate);
  if (sampleBufferUpdate->progress < sampleBufferUpdate->totalSize) {
    // Queue two jobs at a time to reduce idle time on the worker thread
    // (only one job will run at a time but this means the worker thread should
    // normally have something to do next while we're processing the update
    // in the main thread)
    int numberOfJobs = updateArg->secondJobStarted ? 1 : 2;
    for (int i = 0; i < numberOfJobs; i++) {
      emscripten_call_worker(updateArg->worker, "iterateSyroBufferWork",
                             (char *)&sampleBufferUpdate->sampleBufferPointer,
                             sizeof(SampleBufferContainer *), onWorkerMessage,
                             updateArgPointer);
    }
    updateArg->secondJobStarted = true;
  } else {
    emscripten_destroy_worker(updateArg->worker);
    free(updateArg);
  }
}

WorkerUpdateArg *
prepareSampleBufferFromSyroData(SyroData *syro_data,
                                void (*onUpdate)(SampleBufferUpdate *)) {
  int startMessageBufferSize = sizeof(SyroData) + syro_data->Size;
  uint8_t *startMessageBuffer = malloc(startMessageBufferSize);
  SyroData *syroDataCopy = (SyroData *)startMessageBuffer;
  *syroDataCopy = *syro_data;
  uint8_t *pData = startMessageBuffer + sizeof(SyroData);
  memcpy(pData, syro_data->pData, syro_data->Size);
  free_syrodata(syro_data, 1);
  free(syro_data);
  worker_handle worker = emscripten_create_worker("syro-worker.js");
  WorkerUpdateArg *updateArg = malloc(sizeof(WorkerUpdateArg));
  updateArg->worker = worker;
  updateArg->onUpdate = onUpdate;
  updateArg->secondJobStarted = false;
  updateArg->cancelled = false;
  emscripten_call_worker(worker, "startSyroBufferWork",
                         (char *)startMessageBuffer, startMessageBufferSize,
                         onWorkerMessage, (void *)updateArg);
  free(startMessageBuffer);
  return updateArg;
}

// DO NOT USE; broken
// TODO: fix
EMSCRIPTEN_KEEPALIVE
WorkerUpdateArg *
prepareSampleBufferFrom16BitPcmData(uint8_t *pcmData, uint32_t bytes,
                                    uint32_t rate, uint32_t slotNumber,
                                    uint32_t quality, uint32_t useCompression,
                                    void (*onUpdate)(SampleBufferUpdate *)) {
  SyroData *syro_data = getSyroDataFor16BitPcmData(
      pcmData, bytes, rate, slotNumber, quality, useCompression);
  return prepareSampleBufferFromSyroData(syro_data, onUpdate);
}

EMSCRIPTEN_KEEPALIVE
WorkerUpdateArg *prepareSampleBufferFromWavData(
    uint8_t *wavData, uint32_t bytes, uint32_t slotNumber, uint32_t quality,
    uint32_t useCompression, void (*onUpdate)(SampleBufferUpdate *)) {
  SyroData *syro_data = malloc(sizeof(SyroData));
  syro_data->DataType =
      useCompression == 0 ? DataType_Sample_Liner : DataType_Sample_Compress;
  syro_data->Number = slotNumber;
  syro_data->Quality = quality;
  bool ok = setup_file_sample(wavData, bytes, syro_data);
  if (!ok) {
    printf("Oops!\n");
    exit(1);
  }
  return prepareSampleBufferFromSyroData(syro_data, onUpdate);
}

#include "./shared-worker-types.h"
#include "./syro-utils.c"
#include <emscripten.h>

typedef struct WorkerUpdateArg {
  worker_handle worker;
  void (*onUpdate)(SampleBufferUpdate *);
  int activeJobs;
  bool secondJobStarted;
  bool cancelled;
} WorkerUpdateArg;

EMSCRIPTEN_KEEPALIVE
worker_handle createSyroWorker() {
  worker_handle worker = emscripten_create_worker("syro-worker.js");
  return worker;
}

EMSCRIPTEN_KEEPALIVE
void destroySyroWorker(worker_handle worker) {
  emscripten_destroy_worker(worker);
}

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
uint32_t *
getSampleBufferDataStartPointsPointer(SampleBufferUpdate *sampleBufferUpdate) {
  return sampleBufferUpdate->dataStartPoints;
}

// only used for the delete buffer which makes a specific allocation for the
// sample buffer update.
EMSCRIPTEN_KEEPALIVE
void freeDeleteBuffer(SampleBufferUpdate *deleteBufferUpdate) {
  free(deleteBufferUpdate->chunk);
  free((SampleBufferContainer *)deleteBufferUpdate->sampleBufferPointer);
  free(deleteBufferUpdate);
}

EMSCRIPTEN_KEEPALIVE
void cancelSampleBufferWork(WorkerUpdateArg *updateArg) {
  updateArg->cancelled = true;
}

void onWorkerMessage(char *data, int size, void *updateArgPointer) {
  WorkerUpdateArg *updateArg = (WorkerUpdateArg *)updateArgPointer;
  updateArg->activeJobs--;
  if (updateArg->cancelled) {
    if (!updateArg->activeJobs) {
      free(updateArg);
    }
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
      updateArg->activeJobs++;
    }
    updateArg->secondJobStarted = true;
  } else {
    if (!updateArg->activeJobs) {
      free(updateArg);
    }
  }
}

EMSCRIPTEN_KEEPALIVE
WorkerUpdateArg *
prepareSampleBufferFromSyroData(worker_handle worker, SyroData *syro_data,
                                uint32_t NumOfData,
                                void (*onUpdate)(SampleBufferUpdate *)) {
  // count buffer size
  // buffer contains: NumOfData:SyroDataList:WavDataList
  int startMessageBufferSize = 0;
  startMessageBufferSize += sizeof(uint32_t);
  for (uint32_t i = 0; i < NumOfData; i++) {
    SyroData *current_syro_data = syro_data + i;
    startMessageBufferSize += sizeof(SyroData) + current_syro_data->Size;
  }

  uint8_t *startMessageBuffer = malloc(startMessageBufferSize);

  // write NumOfData to buffer
  uint32_t *numOfDataBuffer = (uint32_t *)startMessageBuffer;
  *numOfDataBuffer = NumOfData;

  // copy syro data list into buffer
  SyroData *syroDataCopy = (SyroData *)(startMessageBuffer + sizeof(uint32_t));
  memcpy(syroDataCopy, syro_data, sizeof(SyroData) * NumOfData);

  // iterate through list of syro data and copy wav data one at a time
  // into the buffer
  uint8_t *pDataBuffer =
      startMessageBuffer + sizeof(uint32_t) + sizeof(SyroData) * NumOfData;
  uint32_t pDataOffset = 0;
  for (uint32_t i = 0; i < NumOfData; i++) {
    SyroData *current_syro_data = syro_data + i;
    uint8_t *pData = pDataBuffer + pDataOffset;
    memcpy(pData, current_syro_data->pData, current_syro_data->Size);
    pDataOffset += current_syro_data->Size;
  }

  free_syrodata(syro_data, NumOfData);
  free(syro_data);

  WorkerUpdateArg *updateArg = malloc(sizeof(WorkerUpdateArg));
  updateArg->worker = worker;
  updateArg->onUpdate = onUpdate;
  updateArg->activeJobs = 0;
  updateArg->secondJobStarted = false;
  updateArg->cancelled = false;
  emscripten_call_worker(worker, "startSyroBufferWork",
                         (char *)startMessageBuffer, startMessageBufferSize,
                         onWorkerMessage, (void *)updateArg);
  updateArg->activeJobs++;
  free(startMessageBuffer);
  return updateArg;
}

EMSCRIPTEN_KEEPALIVE
SampleBufferUpdate *getDeleteBufferFromSyroData(SyroData *syro_data,
                                                uint32_t NumOfData) {
  SampleBufferContainer *sampleBuffer = startSampleBuffer(syro_data, NumOfData);
  iterateSampleBuffer(sampleBuffer, INT32_MAX);
  SampleBufferUpdate *sampleBufferUpdate = malloc(sizeof(SampleBufferUpdate));
  sampleBufferUpdate->sampleBufferPointer = (void *)sampleBuffer;
  sampleBufferUpdate->chunk = sampleBuffer->buffer;
  sampleBufferUpdate->chunkSize = sampleBuffer->size;
  sampleBufferUpdate->progress = sampleBuffer->progress;
  sampleBufferUpdate->totalSize = sampleBuffer->size;
  memcpy(sampleBufferUpdate->dataStartPoints, sampleBuffer->dataStartPoints,
         sizeof(sampleBuffer->dataStartPoints));
  free(syro_data);
  return sampleBufferUpdate;
}

EMSCRIPTEN_KEEPALIVE
void createSyroDataFromWavData(SyroData *syro_data, uint32_t syro_data_index,
                               uint8_t *wavData, uint32_t bytes,
                               uint32_t slotNumber, uint32_t quality,
                               uint32_t useCompression) {
  SyroData *current_syro_data = syro_data + syro_data_index;
  current_syro_data->DataType =
      useCompression == 0 ? DataType_Sample_Liner : DataType_Sample_Compress;
  current_syro_data->Number = slotNumber;
  current_syro_data->Quality = quality;
  bool ok = setup_file_sample(wavData, bytes, current_syro_data);
  if (!ok) {
    printf("Oops!\n");
    exit(1);
  }
}

EMSCRIPTEN_KEEPALIVE
void createEmptySyroData(SyroData *syro_data, uint32_t syro_data_index,
                         uint32_t slotNumber) {
  SyroData *current_syro_data = syro_data + syro_data_index;
  current_syro_data->DataType = DataType_Sample_Erase;
  current_syro_data->Number = slotNumber;
  current_syro_data->Fs = 31250;
  current_syro_data->SampleEndian = LittleEndian;
}

EMSCRIPTEN_KEEPALIVE
SyroData *allocateSyroData(uint32_t NumOfData) {
  SyroData *syro_data = malloc(sizeof(SyroData) * NumOfData);
  return syro_data;
}

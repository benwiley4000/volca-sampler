#include "./shared-worker-types.h"
#include "./syro-utils.c"
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
void iterateSyroBufferWork(char *data, int size) {
  SampleBufferContainer *sampleBuffer = *(SampleBufferContainer **)data;

  uint32_t chunkStartIndex = sampleBuffer->progress;
  // if we just started iterating we won't have sent an update for the wav
  // header data so we should make sure we send it
  if (chunkStartIndex == 44) {
    chunkStartIndex = 0;
  }

  // TODO: adapt this iteration count based on observed speed?
  iterateSampleBuffer(sampleBuffer, ITERATION_INTERVAL);

  uint32_t chunkSize = sampleBuffer->progress - chunkStartIndex;

  int messageBufferSize = sizeof(SampleBufferUpdate) + chunkSize;
  uint8_t *messageBuffer = malloc(messageBufferSize);
  SampleBufferUpdate *sampleBufferUpdate = (SampleBufferUpdate *)messageBuffer;
  sampleBufferUpdate->sampleBufferPointer = (void *)sampleBuffer;
  sampleBufferUpdate->chunk = NULL; // to be defined in main thread
  sampleBufferUpdate->chunkSize = sampleBuffer->progress - chunkStartIndex;
  sampleBufferUpdate->progress = sampleBuffer->progress;
  sampleBufferUpdate->totalSize = sampleBuffer->size;
  uint8_t *chunk = messageBuffer + sizeof(SampleBufferUpdate);
  memcpy(chunk, sampleBuffer->buffer + chunkStartIndex, chunkSize);
  emscripten_worker_respond((char *)messageBuffer, messageBufferSize);
  free(messageBuffer);
}

EMSCRIPTEN_KEEPALIVE
void startSyroBufferWork(char *data, int size) {
  SyroData *syro_data = (SyroData *)data;
  if (size - sizeof(SyroData) != syro_data->Size) {
    // TODO: error case... maybe handle it?
  }
  // The passed pData pointer points to memory in the main thread, not the
  // worker thread. We pass the actual data as part of the input buffer so
  // we can replace the pData pointer with one that references memory in the
  // worker thread.
  syro_data->pData = (uint8_t *)(data + sizeof(SyroData));

  SampleBufferContainer *sampleBuffer = startSampleBuffer(syro_data);

  iterateSyroBufferWork((char *)&sampleBuffer, sizeof(SampleBufferContainer *));
}

#include "./syro-utils.c"
#include <emscripten.h>

typedef uint8_t *SyroBufferWorkHandle;

EMSCRIPTEN_KEEPALIVE
void iterateSyroBufferWork(char *data, int size) {
  SyroBufferWorkHandle *handle = (SyroBufferWorkHandle *)data;
  SyroBufferWorkHandle messageBuffer = *handle;
  SampleBufferContainer *sampleBuffer =
      (SampleBufferContainer *)(messageBuffer + sizeof(SyroBufferWorkHandle));

  // TODO: adapt this iteration count based on observed speed?
  iterateSampleBuffer(sampleBuffer, 100000);

  int messageBufferSize = sizeof(SyroBufferWorkHandle) +
                          sizeof(SampleBufferContainer) + sampleBuffer->size;
  emscripten_worker_respond((char *)messageBuffer, messageBufferSize);
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

  // Prepare our message buffer which contains three pieces of data
  int messageBufferSize = sizeof(SyroBufferWorkHandle) +
                          sizeof(SampleBufferContainer) + sampleBuffer->size;
  SyroBufferWorkHandle messageBuffer = malloc(messageBufferSize);
  // The first pointer in message buffer is pointing circularly to itself...
  // This is so we can pass the pointer back and forth with the main thread for
  // future jobs working on the same buffer
  SyroBufferWorkHandle *handle = (SyroBufferWorkHandle *)messageBuffer;
  *handle = messageBuffer;
  // After that we have our sample buffer container
  SampleBufferContainer *sampleBufferCopy =
      (SampleBufferContainer *)(messageBuffer + sizeof(SyroBufferWorkHandle));
  *sampleBufferCopy = *sampleBuffer;
  free(sampleBuffer);
  // And finally the actual wav data which needs to be copied over since the
  // sample buffer container's pointer won't be valid in the main thread
  uint8_t *buffer = messageBuffer + sizeof(SyroBufferWorkHandle) +
                    sizeof(SampleBufferContainer);
  memcpy(buffer, sampleBufferCopy->buffer, sampleBufferCopy->size);
  // Make buffer pointer point to the copy so we can free the other buffer
  uint8_t *oldBuffer = sampleBufferCopy->buffer;
  sampleBufferCopy->buffer = buffer;
  free(oldBuffer);

  iterateSyroBufferWork((char *)handle, sizeof(SyroBufferWorkHandle));
}

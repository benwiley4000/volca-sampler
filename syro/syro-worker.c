#include "./syro-utils.c"
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
void syroBufferWork(char *data, int size) {
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
  int messageBufferSize = sizeof(SampleBufferContainer) + sampleBuffer->size;
  uint8_t *messageBuffer = malloc(messageBufferSize);

  while (true) {
    SampleBufferContainer *sampleBufferCopy =
        (SampleBufferContainer *)messageBuffer;
    *sampleBufferCopy = *sampleBuffer;
    uint8_t *buffer = messageBuffer + sizeof(SampleBufferContainer);
    memcpy(buffer, sampleBuffer->buffer, sampleBuffer->size);
    if (sampleBuffer->progress >= sampleBuffer->size) {
      break;
    }
    emscripten_worker_respond_provisionally((char *)messageBuffer,
                                            messageBufferSize);
    // TODO: adapt this iteration count based on observed speed?
    iterateSampleBuffer(sampleBuffer, 50000);
  }

  emscripten_worker_respond((char *)messageBuffer, messageBufferSize);
  freeSampleBuffer(sampleBuffer);
}

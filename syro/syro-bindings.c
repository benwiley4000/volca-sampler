#include "./syro-utils.c"
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
uint8_t *getSampleBufferPointer(SampleBufferContainer *sampleBuffer) {
  return sampleBuffer->buffer;
}

EMSCRIPTEN_KEEPALIVE
uint32_t getSampleBufferSize(SampleBufferContainer *sampleBuffer) {
  return sampleBuffer->size;
}

EMSCRIPTEN_KEEPALIVE
uint32_t getSampleBufferProgress(SampleBufferContainer *sampleBuffer) {
  return sampleBuffer->progress;
}

void onWorkerMessage(char *data, int size, void *onUpdatePointer) {
  SampleBufferContainer *sampleBuffer = (SampleBufferContainer *)data;
  if (size - sizeof(SampleBufferContainer) != sampleBuffer->size) {
    // TODO: error case... maybe handle it?
  }
  // The passed buffer pointer points to memory in the worker thread, not the
  // main thread. We pass the actual buffer as part of the input buffer so
  // we can replace the buffer pointer with one that references memory in the
  // main thread.
  sampleBuffer->buffer = (uint8_t *)(data + sizeof(SampleBufferContainer));
  void (*onUpdate)(SampleBufferContainer *) = onUpdatePointer;
  onUpdate(sampleBuffer);
}

void prepareSampleBufferFromSyroData(
    SyroData *syro_data, void (*onUpdate)(SampleBufferContainer *)) {
  int startMessageBufferSize = sizeof(SyroData) + syro_data->Size;
  uint8_t *startMessageBuffer = malloc(startMessageBufferSize);
  SyroData *syroDataCopy = (SyroData *)startMessageBuffer;
  *syroDataCopy = *syro_data;
  uint8_t *pData = startMessageBuffer + sizeof(SyroData);
  memcpy(pData, syro_data->pData, syro_data->Size);
  free_syrodata(syro_data, 1);
  free(syro_data);
  worker_handle worker = emscripten_create_worker("syro-worker.js");
  emscripten_call_worker(worker, "syroBufferWork", (char *)startMessageBuffer,
                         startMessageBufferSize, onWorkerMessage,
                         (void *)onUpdate);
  free(startMessageBuffer);
}

// DO NOT USE; broken
// TODO: fix
EMSCRIPTEN_KEEPALIVE
void prepareSampleBufferFrom16BitPcmData(
    uint8_t *pcmData, uint32_t bytes, uint32_t rate, uint32_t slotNumber,
    uint32_t quality, uint32_t useCompression,
    void (*onUpdate)(SampleBufferContainer *)) {
  SyroData *syro_data = getSyroDataFor16BitPcmData(
      pcmData, bytes, rate, slotNumber, quality, useCompression);
  prepareSampleBufferFromSyroData(syro_data, onUpdate);
}

EMSCRIPTEN_KEEPALIVE
void prepareSampleBufferFromWavData(uint8_t *wavData, uint32_t bytes,
                                    uint32_t slotNumber, uint32_t quality,
                                    uint32_t useCompression,
                                    void (*onUpdate)(SampleBufferContainer *)) {
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
  prepareSampleBufferFromSyroData(syro_data, onUpdate);
}

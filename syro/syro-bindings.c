#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif
#include "./syro-example-helpers.c"

typedef struct SampleBufferContainer {
  uint8_t *buffer;
  uint32_t size;
  uint32_t progress;
  // internal
  SyroData *syro_data;
  SyroHandle syro_handle;
} SampleBufferContainer;

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
uint8_t *getSampleBufferPointer(SampleBufferContainer *sampleBuffer) {
  return sampleBuffer->buffer;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
uint32_t getSampleBufferSize(SampleBufferContainer *sampleBuffer) {
  return sampleBuffer->size;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
uint32_t getSampleBufferProgress(SampleBufferContainer *sampleBuffer) {
  return sampleBuffer->progress;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void freeSampleBuffer(SampleBufferContainer *sampleBuffer) {
  free(sampleBuffer->buffer);
  free(sampleBuffer->syro_data);
}

/**
 * Returns a non-zero pointer if successful or 0 if not
 */
SampleBufferContainer *startSampleBuffer(SyroData *syro_data) {
  const int num_of_data = 1;
  uint32_t frame;
  SampleBufferContainer *sampleBuffer = malloc(sizeof(SampleBufferContainer));
  sampleBuffer->syro_data = syro_data;

  //----- Start ------
  SyroStatus status =
      SyroVolcaSample_Start(&(sampleBuffer->syro_handle),
                            sampleBuffer->syro_data, num_of_data, 0, &frame);
  if (status != Status_Success) {
    printf(" Start error, %d \n", status);
    free_syrodata(sampleBuffer->syro_data, num_of_data);
    return 0;
  }

  sampleBuffer->size = (frame * 4) + sizeof(wav_header);
  sampleBuffer->progress = 0;

  sampleBuffer->buffer = malloc(sampleBuffer->size);
  if (!sampleBuffer->buffer) {
    printf(" Not enough memory for write file.\n");
    SyroVolcaSample_End(sampleBuffer->syro_handle);
    free_syrodata(sampleBuffer->syro_data, num_of_data);
    return 0;
  }

  memcpy(sampleBuffer->buffer, wav_header, sizeof(wav_header));
  set_32Bit_value((sampleBuffer->buffer + WAV_POS_RIFF_SIZE),
                  ((frame * 4) + 0x24));
  set_32Bit_value((sampleBuffer->buffer + WAV_POS_DATA_SIZE), (frame * 4));

  sampleBuffer->progress += sizeof(wav_header);

  return sampleBuffer;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void iterateSampleBuffer(SampleBufferContainer *sampleBuffer,
                         int32_t iterations) {
  const int num_of_data = 1;
  int16_t left, right;
  int32_t frame = iterations;
  while (sampleBuffer->progress < sampleBuffer->size && frame) {
    SyroVolcaSample_GetSample(sampleBuffer->syro_handle, &left, &right);
    sampleBuffer->buffer[sampleBuffer->progress++] = (uint8_t)left;
    sampleBuffer->buffer[sampleBuffer->progress++] = (uint8_t)(left >> 8);
    sampleBuffer->buffer[sampleBuffer->progress++] = (uint8_t)right;
    sampleBuffer->buffer[sampleBuffer->progress++] = (uint8_t)(right >> 8);
    frame--;
  }
  if (sampleBuffer->progress == sampleBuffer->size) {
    SyroVolcaSample_End(sampleBuffer->syro_handle);
    free_syrodata(sampleBuffer->syro_data, num_of_data);
  }
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
SampleBufferContainer *
startSampleBufferFrom16BitPcmData(uint8_t *pcmData, uint32_t bytes,
                                  uint32_t rate, uint32_t slotNumber,
                                  uint32_t quality, uint32_t useCompression) {
  SyroData *syro_data = malloc(sizeof(SyroData));
  syro_data->DataType =
      useCompression == 0 ? DataType_Sample_Liner : DataType_Sample_Compress;
  syro_data->Number = slotNumber;
  syro_data->Quality = quality;
  syro_data->pData = pcmData;
  syro_data->Size = bytes;
  syro_data->Fs = rate;
  syro_data->SampleEndian = LittleEndian;
  return startSampleBuffer(syro_data);
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
SampleBufferContainer *
prepareSampleBufferFrom16BitPcmData(uint8_t *pcmData, uint32_t bytes,
                                    uint32_t rate, uint32_t slotNumber,
                                    uint32_t quality, uint32_t useCompression) {
  SampleBufferContainer *sampleBuffer = startSampleBufferFrom16BitPcmData(
      pcmData, bytes, rate, slotNumber, quality, useCompression);
  if (!sampleBuffer) {
    printf("Oops!\n");
    return 0;
  }
  iterateSampleBuffer(sampleBuffer, INT32_MAX);
  return sampleBuffer;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
SampleBufferContainer *prepareSampleBufferFromWavData(uint8_t *wavData,
                                                      uint32_t bytes,
                                                      uint32_t slotNumber,
                                                      uint32_t quality,
                                                      uint32_t useCompression) {
  SyroData *syro_data = malloc(sizeof(SyroData));
  syro_data->DataType =
      useCompression == 0 ? DataType_Sample_Liner : DataType_Sample_Compress;
  syro_data->Number = slotNumber;
  syro_data->Quality = quality;
  bool ok = setup_file_sample(wavData, bytes, syro_data);
  if (!ok) {
    printf("Oops!\n");
    return 0;
  }
  SampleBufferContainer *sampleBuffer = startSampleBuffer(syro_data);
  if (!sampleBuffer) {
    printf("Oops!\n");
    return 0;
  }
  iterateSampleBuffer(sampleBuffer, INT32_MAX);
  return sampleBuffer;
}

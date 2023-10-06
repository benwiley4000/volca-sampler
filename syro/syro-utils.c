#include "./syro-example-helpers.c"

typedef struct SampleBufferContainer {
  uint8_t *buffer;
  uint32_t size;
  uint32_t progress;
  // internal
  SyroData *syro_data;
  SyroHandle syro_handle;
} SampleBufferContainer;

void freeSampleBuffer(SampleBufferContainer *sampleBuffer) {
  free(sampleBuffer->buffer);
  free(sampleBuffer->syro_data);
}

/**
 * Returns a non-zero pointer if successful or 0 if not
 */
SampleBufferContainer *startSampleBuffer(SyroData *syro_data,
                                         uint32_t NumOfData) {
  uint32_t frame;
  SampleBufferContainer *sampleBuffer = malloc(sizeof(SampleBufferContainer));
  sampleBuffer->syro_data = syro_data;

  //----- Start ------
  SyroStatus status =
      SyroVolcaSample_Start(&(sampleBuffer->syro_handle),
                            sampleBuffer->syro_data, NumOfData, 0, &frame);
  if (status != Status_Success) {
    printf(" Start error, %d \n", status);
    free_syrodata(sampleBuffer->syro_data, NumOfData);
    return 0;
  }

  sampleBuffer->size = (frame * 4) + sizeof(wav_header);
  sampleBuffer->progress = 0;

  sampleBuffer->buffer = malloc(sampleBuffer->size);
  if (!sampleBuffer->buffer) {
    printf(" Not enough memory for write file.\n");
    SyroVolcaSample_End(sampleBuffer->syro_handle);
    free_syrodata(sampleBuffer->syro_data, NumOfData);
    return 0;
  }

  memcpy(sampleBuffer->buffer, wav_header, sizeof(wav_header));
  set_32Bit_value((sampleBuffer->buffer + WAV_POS_RIFF_SIZE),
                  ((frame * 4) + 0x24));
  set_32Bit_value((sampleBuffer->buffer + WAV_POS_DATA_SIZE), (frame * 4));

  sampleBuffer->progress += sizeof(wav_header);

  return sampleBuffer;
}

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

SyroData *getSyroDataForWavData(uint8_t *wavData, uint32_t bytes,
                                uint32_t slotNumber, uint32_t quality,
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
  return syro_data;
}

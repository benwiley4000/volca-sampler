#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif
#include "./syro-example-helpers.c"

uint8_t *buf_dest;
uint32_t size_dest;
uint32_t progress_dest;

// internal
SyroData *current_syro_data;
SyroHandle *current_syro_handle;

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
uint8_t *getSampleBufferPointer()
{
  return buf_dest;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
uint32_t getSampleBufferSize()
{
  return size_dest;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
uint32_t getSampleBufferProgress()
{
  return progress_dest;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void freeSampleBuffer()
{
  free(buf_dest);
  free(current_syro_data);
  free(current_syro_handle);
}

int startSampleBuffer()
{
  SyroStatus status;
  const int num_of_data = 1;
  uint32_t frame;

  //----- Start ------
  status = SyroVolcaSample_Start(current_syro_handle, current_syro_data, num_of_data, 0, &frame);
  if (status != Status_Success)
  {
    printf(" Start error, %d \n", status);
    free_syrodata(current_syro_data, num_of_data);
    return 1;
  }

  size_dest = (frame * 4) + sizeof(wav_header);
  progress_dest = 0;

  buf_dest = malloc(size_dest);
  if (!buf_dest)
  {
    printf(" Not enough memory for write file.\n");
    SyroVolcaSample_End(*current_syro_handle);
    free_syrodata(current_syro_data, num_of_data);
    return 1;
  }

  memcpy(buf_dest, wav_header, sizeof(wav_header));
  set_32Bit_value((buf_dest + WAV_POS_RIFF_SIZE), ((frame * 4) + 0x24));
  set_32Bit_value((buf_dest + WAV_POS_DATA_SIZE), (frame * 4));

  progress_dest += sizeof(wav_header);

  return 0;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void iterateSampleBuffer(int32_t iterations)
{
  const int num_of_data = 1;
  int16_t left, right;
  int32_t frame = iterations;
  while (progress_dest < size_dest && frame)
  {
    SyroVolcaSample_GetSample(*current_syro_handle, &left, &right);
    buf_dest[progress_dest++] = (uint8_t)left;
    buf_dest[progress_dest++] = (uint8_t)(left >> 8);
    buf_dest[progress_dest++] = (uint8_t)right;
    buf_dest[progress_dest++] = (uint8_t)(right >> 8);
    frame--;
  }
  if (progress_dest == size_dest)
  {
    SyroVolcaSample_End(*current_syro_handle);
    free_syrodata(current_syro_data, num_of_data);
  }
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
int prepareSampleBufferFrom16BitPcmData(uint8_t *pcmData, uint32_t bytes, uint32_t rate, uint32_t slotNumber, uint32_t quality, uint32_t useCompression)
{
  current_syro_data = malloc(sizeof(SyroData));
  current_syro_data->DataType = useCompression == 0 ? DataType_Sample_Liner : DataType_Sample_Compress;
  current_syro_data->Number = slotNumber;
  current_syro_data->Quality = quality;
  current_syro_data->pData = pcmData;
  current_syro_data->Size = bytes;
  current_syro_data->Fs = rate;
  current_syro_data->SampleEndian = LittleEndian;
  int error = startSampleBuffer();
  if (error)
  {
    printf("Oops!\n");
    return 1;
  }
  iterateSampleBuffer(size_dest);
  return 0;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
int startSampleBufferFrom16BitPcmData(uint8_t *pcmData, uint32_t bytes, uint32_t rate, uint32_t slotNumber, uint32_t quality, uint32_t useCompression)
{
  current_syro_data = malloc(sizeof(SyroData));
  current_syro_data->DataType = useCompression == 0 ? DataType_Sample_Liner : DataType_Sample_Compress;
  current_syro_data->Number = slotNumber;
  current_syro_data->Quality = quality;
  current_syro_data->pData = pcmData;
  current_syro_data->Size = bytes;
  current_syro_data->Fs = rate;
  current_syro_data->SampleEndian = LittleEndian;
  return startSampleBuffer();
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
int prepareSampleBufferFromWavData(uint8_t *wavData, uint32_t bytes, uint32_t slotNumber, uint32_t quality, uint32_t useCompression)
{
  current_syro_data = malloc(sizeof(SyroData));
  current_syro_data->DataType = useCompression == 0 ? DataType_Sample_Liner : DataType_Sample_Compress;
  current_syro_data->Number = slotNumber;
  current_syro_data->Quality = quality;
  bool ok = setup_file_sample(wavData, bytes, current_syro_data);
  if (!ok)
  {
    printf("Oops!\n");
    return 1;
  }
  int error = startSampleBuffer();
  if (error)
  {
    printf("Oops!\n");
    return 1;
  }
  iterateSampleBuffer(size_dest);
  return 0;
}

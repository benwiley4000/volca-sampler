#include "../syro/syro-utils.c"

// taken from syro example
static bool write_file(char *filename, uint8_t *buf, uint32_t size) {
  FILE *fp;

  fp = fopen(filename, "wb");
  if (!fp) {
    printf(" File open error, %s \n", filename);
    return false;
  }

  if (fwrite(buf, 1, size, fp) < size) {
    printf(" File write error(perhaps disk space is not enough), %s \n",
           filename);
    fclose(fp);
    return false;
  }

  fclose(fp);

  return true;
}

// taken from syro example
static uint8_t *read_file(char *filename, uint32_t *psize) {
  FILE *fp;
  uint8_t *buf;
  uint32_t size;

  fp = fopen((const char *)filename, "rb");
  if (!fp) {
    printf(" File open error, %s \n", filename);
    return NULL;
  }

  fseek(fp, 0, SEEK_END);
  size = ftell(fp);
  fseek(fp, 0, SEEK_SET);

  buf = malloc(size);
  if (!buf) {
    printf(" Not enough memory for read file.\n");
    fclose(fp);
    return NULL;
  }

  if (fread(buf, 1, size, fp) < size) {
    printf(" File read error, %s \n", filename);
    fclose(fp);
    free(buf);
    return NULL;
  }

  fclose(fp);

  *psize = size;
  return buf;
}

int lastSlashIndex(char *filename, int length) {
  int last = -1;
  for (int i = 0; i < length; i++) {
    if (filename[i] == '/') {
      last = i;
    }
  }
  return last;
}

int convertSample(char *filename, uint8_t *inputArray, uint32_t bytes,
                  uint32_t slotNumber, bool useCompression) {
  SyroData *syro_data = getSyroDataForWavData(inputArray, bytes, slotNumber, 16,
                                              useCompression ? 1 : 0);
  SampleBufferContainer *sampleBuffer = startSampleBuffer(syro_data);
  if (!sampleBuffer) {
    printf("Oops!\n");
    return 1;
  }
  iterateSampleBuffer(sampleBuffer, INT32_MAX);

  if (write_file(filename, sampleBuffer->buffer, sampleBuffer->size)) {
    freeSampleBuffer(sampleBuffer);
  } else {
    printf("Oops\n");
    freeSampleBuffer(sampleBuffer);
    return 1;
  }
  return 0;
}

int main(int argc, char **argv) {
  if (argc != 3) {
    printf("Expected two arguments\n");
    return 1;
  }
  char *wavfilename = argv[1];
  uint8_t slotNumber = (uint8_t)atoi(argv[2]);
  if (strcmp(wavfilename + strlen(wavfilename) - 4, ".wav") != 0) {
    printf("Expected filename to end with '.wav'\n");
    return 1;
  }
  if (slotNumber < 0 || slotNumber > 99) {
    printf("Expected slotNumber between 0 and 99\n");
    return 1;
  }
  uint32_t bytes;
  uint8_t *inputArray = read_file(wavfilename, &bytes);
  if (!inputArray) {
    printf("Oops\n");
    return 1;
  }

  int afterLastSlashIndex =
      lastSlashIndex(wavfilename, strlen(wavfilename)) + 1;
  char *base_name = wavfilename + afterLastSlashIndex;
  int base_name_len = strlen(wavfilename) - afterLastSlashIndex;

  char *compressed_filename;
  char *uncompressed_filename;

  int err;
  // generate compressed
  {
    char label[] = " [native] (compressed).syrostream";
    char *filename = malloc(base_name_len + strlen(label));
    strcpy(filename, base_name);
    strcpy(filename + base_name_len - 4, label);
    strcpy(filename + base_name_len + strlen(label) - 4, ".wav");
    err = convertSample(filename, inputArray, bytes, slotNumber, true);
    if (err) {
      return 1;
    }
    compressed_filename = filename;
  }
  // generate uncompressed
  {
    char label[] = " [native] (uncompressed).syrostream";
    char *filename = malloc(base_name_len + strlen(label));
    strcpy(filename, base_name);
    strcpy(filename + base_name_len - 4, label);
    strcpy(filename + base_name_len + strlen(label) - 4, ".wav");
    err = convertSample(filename, inputArray, bytes, slotNumber, false);
    if (err) {
      return 1;
    }
    uncompressed_filename = filename;
  }

  free(inputArray);
  printf("{ \"compressed\": \"%s\", \"uncompressed\": \"%s\" }\n",
         compressed_filename, uncompressed_filename);
  return 0;
}

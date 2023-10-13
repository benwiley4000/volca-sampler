#include <stdint.h>

#define ITERATION_INTERVAL 100000

typedef struct SampleBufferUpdate {
  void *sampleBufferPointer;
  uint8_t *chunk;
  uint32_t chunkSize;
  uint32_t progress;
  uint32_t totalSize;
  uint32_t dataStartPoints[110];
} SampleBufferUpdate;

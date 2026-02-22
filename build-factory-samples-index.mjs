import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { v4: uuidv4 } = require('uuid');
const pcmConvert = require('pcm-convert');
const { encode: encodeBase64 } = require('base64-arraybuffer');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLE_RATE = 31250;
const GROUP_PIXEL_WIDTH = 6;
const WAVEFORM_CACHED_WIDTH = GROUP_PIXEL_WIDTH * 44; // 264

/**
 * Inlined from src/utils/waveform.js to avoid importing React dependency chain
 * @param {Float32Array} samples
 * @param {number} containerPixelWidth
 */
function getPeaksForSamples(samples, containerPixelWidth) {
  const groupSize = Math.floor(
    (GROUP_PIXEL_WIDTH * samples.length) / containerPixelWidth
  );
  if (groupSize === 0) {
    return {
      positive: new Float32Array(),
      negative: new Float32Array(),
    };
  }
  const positive = new Float32Array(Math.floor(samples.length / groupSize));
  const negative = new Float32Array(Math.floor(samples.length / groupSize));
  for (let i = 0; i < positive.length; i++) {
    const group = new Float32Array(
      samples.buffer,
      samples.byteOffset + i * groupSize * 4,
      groupSize
    );
    let max = 0;
    let min = 0;
    for (const sample of group) {
      if (sample > max) max = sample;
      if (sample < min) min = sample;
    }
    positive[i] = max;
    negative[i] = min;
  }
  return { positive, negative };
}

const pathPrefix = 'factory-samples';
const factorySamplesDirLocalPath = path.join(__dirname, 'public', pathPrefix);

const filenames = await fs.readdir(factorySamplesDirLocalPath);
const factorySamplesIndex = (
  await Promise.all(
    filenames
      .filter((filename) => filename.endsWith('.wav'))
      .map(async (filename) => {
        const fileContent = await fs.readFile(
          path.join(factorySamplesDirLocalPath, filename)
        );
        // 16-bit mono sequences; 44-byte offset to skip WAV header.
        const pcmData = new Int16Array(fileContent.buffer, 44);
        const float32Data = pcmConvert(pcmData, 'float32');
        const waveformPeaks = getPeaksForSamples(
          float32Data,
          WAVEFORM_CACHED_WIDTH
        );
        return {
          name: filename.slice(3, -4),
          sourceFileId: `${pathPrefix}/${filename}`,
          trim: { frames: [0, 0] },
          id: uuidv4(),
          slotNumber: Number(filename.slice(0, 2)),
          dateSampled: new Date('2014-10-01').toISOString(),
          cachedInfo: {
            waveformPeaks: {
              positive: encodeBase64(waveformPeaks.positive.buffer),
              negative: encodeBase64(waveformPeaks.negative.buffer),
            },
            postPluginFrameCount: float32Data.length,
            duration: float32Data.length / SAMPLE_RATE,
            failedPluginIndex: -1,
          },
        };
      })
  )
).sort((a, b) => a.slotNumber - b.slotNumber);

const factorySamplesIndexPath = path.join(
  __dirname,
  'public',
  'factory-samples.json'
);
await fs.writeFile(
  factorySamplesIndexPath,
  JSON.stringify(factorySamplesIndex, null, 2)
);

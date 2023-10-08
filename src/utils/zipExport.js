import JSZip from 'jszip';
import { SampleContainer } from '../store';

/** @typedef {Record<string, import('../store').SampleMetadata>} MetadataMap */

/**
 * @param {SampleContainer[]} sampleContainers
 * @param {(progress: number) => void} onProgress
 * @returns {Promise<Blob>}
 */
export async function exportSampleContainersToZip(
  sampleContainers,
  onProgress
) {
  // don't support exporting list of factory samples
  const sampleContainersToExport = sampleContainers.filter(
    (sampleContainer) => {
      if (!(sampleContainer instanceof SampleContainer.Mutable)) {
        console.warn(
          'Not exporting un-editable factory sample',
          sampleContainer.id
        );
        return false;
      }
      return true;
    }
  );
  const zip = new JSZip();
  const zipRoot = zip.folder('volcasampler');
  if (!zipRoot) {
    throw new Error('Failed to create root folder');
  }
  const samplesFolder = zipRoot.folder('samples');
  if (!samplesFolder) {
    throw new Error('Failed to create samples folder');
  }
  const metadataMap = sampleContainersToExport.reduce(
    (metadataMap, sampleContainer) => {
      metadataMap[sampleContainer.id] = sampleContainer.metadata;
      return metadataMap;
    },
    /** @type {MetadataMap} */ ({})
  );
  zipRoot.file(
    'volcasampler.json',
    JSON.stringify({ samples: metadataMap }, null, 2),
    { binary: false }
  );
  /** @type {Set<string>} */
  const processedSourceFileIds = new Set();
  for (const sampleContainer of sampleContainersToExport) {
    const { sourceFileId, userFileInfo, name } = sampleContainer.metadata;
    if (processedSourceFileIds.has(sourceFileId)) continue;
    processedSourceFileIds.add(sourceFileId);
    if (sourceFileId.includes('.')) {
      // assume it's a url to a factory sample, don't include in zip
      continue;
    }
    const filename = `${name} - ${sourceFileId}${
      userFileInfo ? userFileInfo.ext : '.wav'
    }`;
    samplesFolder.file(
      filename,
      SampleContainer.getSourceFileData(sourceFileId, true).then((data) => {
        return new Blob([data], {
          type: userFileInfo ? userFileInfo.type : 'audio/x-wav',
        });
      })
    );
  }
  const zipWriteStream = zip.generateInternalStream({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
    streamFiles: true,
  });
  zipWriteStream.on('data', (_, { percent }) => onProgress(percent / 100));
  return zipWriteStream.accumulate();
}

import JSZip from 'jszip';
import {
  SampleContainer,
  isAudioSourceFileInStore,
  sampleContainerDateCompare,
  storeAudioSourceFile,
} from '../store';
import { SampleCache } from '../sampleCacheStore';
import { addPlugin, getPluginSource } from '../pluginStore';
import { Mutex } from './mutex';

/** @typedef {import('../store').SampleMetadataExport} SampleMetadataExport */
/** @typedef {Record<string, SampleMetadataExport>} MetadataMap */

const rootFolderName = 'volcasampler';
const samplesFolderName = 'user samples';
const pluginsFolderName = 'plugins';
const metadataJSONName = 'volcasampler.json';

/**
 * @param {SampleContainer[]} sampleContainers
 * @param {(progress: number) => void} onProgress
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
  const zipRoot = zip.folder(rootFolderName);
  if (!zipRoot) {
    throw new Error('Failed to create root folder');
  }
  const samplesFolder = zipRoot.folder(samplesFolderName);
  if (!samplesFolder) {
    throw new Error('Failed to create samples folder');
  }
  const pluginsFolder = zipRoot.folder(pluginsFolderName);
  if (!pluginsFolder) {
    throw new Error('Failed to create plugins folder');
  }
  const metadataMap = sampleContainersToExport.reduce(
    (metadataMap, sampleContainer) => {
      metadataMap[sampleContainer.id] = sampleContainer.metadata;
      return metadataMap;
    },
    /** @type {MetadataMap} */ ({})
  );
  zipRoot.file(
    metadataJSONName,
    JSON.stringify({ samples: metadataMap }, null, 2),
    { binary: false }
  );
  /** @type {Set<string>} */
  const processedSourceFileIds = new Set();
  /** @type {Set<string>} */
  const processedPluginNames = new Set();
  for (const sampleContainer of sampleContainersToExport) {
    const { sourceFileId, userFileInfo, name, plugins } =
      sampleContainer.metadata;
    if (!processedSourceFileIds.has(sourceFileId)) {
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
    for (const { pluginName } of plugins) {
      if (!processedPluginNames.has(pluginName)) {
        processedPluginNames.add(pluginName);
        const pluginSource = await getPluginSource(pluginName);
        if (pluginSource) {
          samplesFolder.file(
            pluginName,
            new Blob([pluginSource], { type: 'text/javascript' })
          );
        }
      }
    }
  }
  if (!processedPluginNames.size) {
    zipRoot.remove(pluginsFolderName);
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

/**
 * @param {Blob | JSZip} zipFile
 * @returns {Promise<MetadataMap>}
 */
export async function readSampleMetadataFromZip(zipFile) {
  const zip =
    zipFile instanceof JSZip ? zipFile : await JSZip.loadAsync(zipFile);
  const zipRoot = zip.folder(rootFolderName);
  if (!zipRoot) {
    throw new Error('Failed to access root folder');
  }
  const metadataMapHandle = zipRoot.file(metadataJSONName);
  if (!metadataMapHandle) {
    throw new Error('Missing expected volcasampler.json file');
  }
  /** @type {{ samples: MetadataMap }} */
  const { samples: metadataMap } = JSON.parse(
    await metadataMapHandle.async('text')
  );
  return metadataMap;
}

/**
 * @typedef {Record<
 *   string,
 *   { metadata: MetadataMap['string']; error: unknown }
 * >} FailedImports
 */

/**
 * @param {object} params
 * @param {Blob} params.zipFile
 * @param {string[]} params.idsToImport
 * @param {(progress: number) => void} params.onProgress
 * @param {(name: string) => Promise<string>} params.onConfirmPluginName
 * @param {(name: string) => Promise<
 *   'replace' | 'use-existing' | 'change-name'
 * >} params.onConfirmPluginReplace
 * @returns {Promise<{
 *   sampleContainers: SampleContainer[];
 *   sampleCaches: SampleCache[];
 *   failedImports: FailedImports;
 * }>}
 */
export async function importSampleContainersFromZip({
  zipFile,
  idsToImport,
  onProgress,
  onConfirmPluginName,
  onConfirmPluginReplace,
}) {
  const zip = await JSZip.loadAsync(zipFile);
  const metadataMap = await readSampleMetadataFromZip(zip);
  const zipRoot = zip.folder(rootFolderName);
  if (!zipRoot) {
    throw new Error('Failed to create root folder');
  }
  const samplesFolder = zipRoot.folder(samplesFolderName);
  if (!samplesFolder) {
    throw new Error('Failed to create samples folder');
  }
  const pluginsFolder = zipRoot.folder(pluginsFolderName);
  if (!pluginsFolder) {
    throw new Error('Failed to create plugins folder');
  }
  /** @type {Map<string, Promise<void>>} */
  const sourceDataProcessingPromises = new Map();
  /** @type {Map<string, Promise<void>>} */
  const pluginProcessingPromises = new Map();
  /** @type {FailedImports} */
  const failedImports = {};
  /** @type {SampleContainer[]} */
  const sampleContainers = [];
  /** @type {SampleCache[]} */
  const sampleCaches = [];
  const progresses = /** @type {number[]} */ (Array(idsToImport.length)).fill(
    0
  );
  const reportProgress = () =>
    onProgress(
      progresses.reduce((total, p) => total + p, 0) / progresses.length
    );
  const pluginMutex = new Mutex();
  await Promise.all(
    Object.entries(metadataMap).map(async ([id, metadata], i) => {
      if (!idsToImport.includes(id)) return;
      try {
        const { sourceFileId, plugins = [] } = metadata;
        if (!sourceDataProcessingPromises.has(sourceFileId)) {
          sourceDataProcessingPromises.set(
            sourceFileId,
            (async () => {
              const needsToImportFile = !(await isAudioSourceFileInStore(
                sourceFileId
              ));
              if (needsToImportFile) {
                const [sourceFileHandle] = samplesFolder.file(
                  new RegExp(`${sourceFileId}\\.\\w+$`)
                );
                if (!sourceFileHandle) {
                  throw new Error('Cannot find source file');
                }
                const sourceFileData = await sourceFileHandle.async(
                  'uint8array',
                  ({ percent, currentFile }) => {
                    progresses[i] = percent / 100;
                    reportProgress();
                  }
                );
                await storeAudioSourceFile(sourceFileData, sourceFileId);
              }
            })()
          );
        }
        for (const { pluginName } of plugins) {
          if (!pluginProcessingPromises.has(pluginName)) {
            pluginProcessingPromises.set(
              pluginName,
              (async () => {
                const pluginFileHandle = pluginsFolder.file(pluginName);
                if (!pluginFileHandle) {
                  throw new Error('Cannot find plugin file');
                }
                const pluginSource = await pluginFileHandle.async('string');
                const unlock = await pluginMutex.lock();
                try {
                  await addPlugin({
                    pluginName,
                    pluginSource,
                    onConfirmName: onConfirmPluginName,
                    onConfirmReplace: onConfirmPluginReplace,
                  });
                  unlock();
                } catch (err) {
                  unlock();
                  throw err;
                }
              })()
            );
          }
        }
        await sourceDataProcessingPromises.get(sourceFileId);
        await Promise.all(
          plugins.map(({ pluginName }) =>
            pluginProcessingPromises.get(pluginName)
          )
        );
        const sampleContainer = await SampleContainer.importToStorage(
          id,
          metadata
        );
        sampleContainers.push(sampleContainer);
        const sampleCache = await SampleCache.importToStorage(sampleContainer);
        sampleCaches.push(sampleCache);
      } catch (error) {
        progresses[i] = 1;
        failedImports[id] = {
          metadata,
          error,
        };
        reportProgress();
      }
    })
  );
  onProgress(1);
  return {
    sampleContainers: sampleContainers.slice().sort(sampleContainerDateCompare),
    sampleCaches,
    failedImports,
  };
}

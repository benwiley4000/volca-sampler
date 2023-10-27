import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { decode as decodeBase64 } from 'base64-arraybuffer';

import { SAMPLE_RATE } from './utils/constants.js';
import {
  findSamplePeak,
  getMonoSamplesFromAudioBuffer,
  getSourceAudioBuffer,
} from './utils/audioData.js';
import { getSamplePeaksForAudioBuffer } from './utils/waveform.js';

/**
 * @typedef {{
 *   frames: [number, number];
 * }} TrimInfo
 */

/**
 * @typedef {{
 *   waveformPeaks: import('./utils/waveform').SamplePeaks;
 *   duration: number;
 *   srcDuration: number;
 * }} CachedInfo
 */

/**
 * @typedef {null | 'all' | 'selection'} NormalizeSetting
 */

/**
 * @typedef {object} SampleContainerParams
 * @property {string} name
 * @property {string} sourceFileId
 * @property {TrimInfo} trim
 * @property {CachedInfo} cachedInfo
 * @property {string} [id]
 * @property {{ type: string; ext: string } | null} [userFileInfo]
 * @property {number} [slotNumber]
 * @property {string} [dateSampled]
 * @property {string} [dateModified]
 * @property {boolean} [useCompression]
 * @property {number} [qualityBitDepth]
 * @property {NormalizeSetting} [normalize]
 * @property {number} [pitchAdjustment]
 */

/**
 * @typedef {object} SampleMetadata
 * @property {string} name
 * @property {string} sourceFileId
 * @property {TrimInfo} trim
 * @property {{ type: string; ext: string } | null} userFileInfo
 * @property {number} slotNumber
 * @property {string} dateSampled
 * @property {string} dateModified
 * @property {boolean} useCompression
 * @property {number} qualityBitDepth
 * @property {NormalizeSetting} normalize
 * @property {string} metadataVersion
 * @property {number} pitchAdjustment
 * @property {CachedInfo} cachedInfo
 */

/**
 * @typedef {object} SampleMetadataUpdate
 * @property {string} [name]
 * @property {TrimInfo} [trim]
 * @property {number} [slotNumber]
 * @property {boolean} [useCompression]
 * @property {number} [qualityBitDepth]
 * @property {NormalizeSetting} [normalize]
 * @property {number} [pitchAdjustment]
 */

/**
 * @typedef {SampleMetadataUpdate | ((metadata: SampleMetadata) => SampleMetadataUpdate)} SampleMetadataUpdateArg
 */

const audioFileDataStore = localforage.createInstance({
  name: 'audio_file_data',
  driver: localforage.INDEXEDDB,
});

const sampleMetadataStore = localforage.createInstance({
  name: 'sample_metadata',
  driver: localforage.INDEXEDDB,
});

/** @param {string} id */
export async function isAudioSourceFileInStore(id) {
  return (await audioFileDataStore.keys()).includes(id);
}

/**
 * @param {Uint8Array} audioFileData
 * @param {string} [externalId]
 * @returns {Promise<string>} id
 */
export async function storeAudioSourceFile(audioFileData, externalId) {
  if (externalId && (await isAudioSourceFileInStore(externalId))) {
    throw new Error('Cannot store audio source file at already used id');
  }
  const id = externalId || uuidv4();
  await audioFileDataStore.setItem(id, audioFileData);
  return id;
}

const METADATA_VERSION = '0.8.0';

// These properties are considered fundamental and should never break
/**
 * @typedef {{
 *   name: string;
 *   sourceFileId: string;
 *   metadataVersion: string;
 * }} OldMetadata
 */

/**
 * @type {Record<string, (oldMetadata: OldMetadata) => OldMetadata | Promise<OldMetadata>>}
 */
const metadataUpgrades = {
  '0.1.0': (oldMetadata) => {
    /**
     * @typedef {OldMetadata & { clip: [number, number] }} PrevMetadata
     */
    const { clip, ...prevMetadata } = /** @type {PrevMetadata} */ (oldMetadata);
    const newMetadata = {
      ...prevMetadata,
      trimFrames: /** @type {[number, number]} */ (
        clip.map((c) => Math.round(c * SAMPLE_RATE))
      ),
      metadataVersion: '0.2.0',
    };
    return newMetadata;
  },
  '0.2.0': async (oldMetadata) => {
    /**
     * @typedef {OldMetadata & { trimFrames: [number, number] }} PrevMetadata
     */
    const { trimFrames, ...prevMetadata } = /** @type {PrevMetadata} */ (
      oldMetadata
    );
    const audioBuffer = await getSourceAudioBuffer(
      prevMetadata.sourceFileId,
      false
    );
    const waveformPeaks = await getSamplePeaksForAudioBuffer(
      audioBuffer,
      trimFrames
    );
    /**
     * @type {TrimInfo & { waveformPeaks: CachedInfo['waveformPeaks'] }}
     */
    const trim = {
      frames: trimFrames,
      waveformPeaks,
    };
    const newMetadata = {
      ...prevMetadata,
      trim,
      metadataVersion: '0.3.0',
    };
    return newMetadata;
  },
  '0.3.0': (oldMetadata) => {
    /**
     * @typedef {OldMetadata & {
     *   dateSampled: number;
     *   dateModified: number;
     * }} PrevMetadata
     */
    const { dateSampled, dateModified, ...prevMetadata } =
      /** @type {PrevMetadata} */ (oldMetadata);
    const newMetadata = {
      ...prevMetadata,
      dateSampled: new Date(dateSampled).toISOString(),
      dateModified: new Date(dateModified).toISOString(),
      metadataVersion: '0.4.0',
    };
    return newMetadata;
  },
  '0.4.0': async (oldMetadata) => {
    /**
     * @typedef {OldMetadata & {
     *   scaleCoefficient: number;
     *   trim: TrimInfo & {
     *     waveformPeaks: Omit<
     *       CachedInfo['waveformPeaks'],
     *       'normalizationCoefficient'
     *     >
     *   }
     * }} PrevMetadata
     */
    const {
      scaleCoefficient,
      trim: { frames: trimFrames, waveformPeaks },
      ...prevMetadata
    } = /** @type {PrevMetadata} */ (oldMetadata);
    const audioBuffer = await getSourceAudioBuffer(
      prevMetadata.sourceFileId,
      false
    );
    const monoSamples = getMonoSamplesFromAudioBuffer(audioBuffer, trimFrames);
    const samplePeak = findSamplePeak(monoSamples);
    const newMetadata = {
      ...prevMetadata,
      normalize: scaleCoefficient !== 1,
      trim: {
        frames: trimFrames,
        waveformPeaks: {
          ...waveformPeaks,
          normalizationCoefficient: 1 / samplePeak,
        },
      },
      metadataVersion: '0.5.0',
    };
    return newMetadata;
  },
  '0.5.0': (oldMetadata) => {
    /**
     * @typedef {OldMetadata & {
     *   normalize: boolean;
     * }} PrevMetadata
     */
    const { normalize, ...prevMetadata } = /** @type {PrevMetadata} */ (
      oldMetadata
    );
    /** @type {NormalizeSetting} */
    const newNormalize = normalize ? 'selection' : null;
    const newMetadata = {
      ...prevMetadata,
      normalize: newNormalize,
      metadataVersion: '0.6.0',
    };
    return newMetadata;
  },
  '0.6.0': (oldMetadata) => {
    const newMetadata = {
      ...oldMetadata,
      pitchAdjustment: 1,
      metadataVersion: '0.7.0',
    };
    return newMetadata;
  },
  '0.7.0': async (oldMetadata) => {
    /**
     * @typedef {OldMetadata & {
     *   trim: TrimInfo & {
     *     waveformPeaks: CachedInfo['waveformPeaks'];
     *   }
     * }} PrevMetadata
     */
    const {
      trim: { frames, waveformPeaks },
      ...prevMetadata
    } = /** @type {PrevMetadata} */ (oldMetadata);
    const audioBuffer = await getSourceAudioBuffer(
      prevMetadata.sourceFileId,
      false
    );
    /** @type {CachedInfo} */
    const cachedInfo = {
      waveformPeaks,
      duration: audioBuffer.duration - (frames[0] + frames[1]) / SAMPLE_RATE,
      srcDuration: audioBuffer.duration,
    };
    const newMetadata = {
      ...oldMetadata,
      trim: { frames },
      cachedInfo,
      metadataVersion: '0.8.0',
    };
    return newMetadata;
  },
};

/**
 * We will leave out cachedInfo and recompute on import. The trim property is
 * needed to compute this. The cached info is redundant and computablem and is
 * mainly to make rendering faster.
 *
 * NOTE: We are also going to assume the existence of a few extra properties,
 * since the export is a new feature that won't process older metadata.
 *
 * @typedef {OldMetadata & {
 *   trim?: TrimInfo;
 *   slotNumber: SampleMetadata['slotNumber'];
 *   dateSampled: SampleMetadata['dateSampled'];
 *   dateModified: SampleMetadata['dateModified'];
 * }} SampleMetadataExport
 */

/** @typedef {import('./utils/waveform.js').SamplePeaks} SamplePeaks */

/**
 * @type {Record<string, (exportMetadata: SampleMetadataExport) => OldMetadata | Promise<OldMetadata>>}
 */
const exportMetadataToOldMetadata = {
  '0.6.0': async (exportMetadata) => {
    /**
     * @typedef {SampleMetadataExport & { trim: TrimInfo }} ExportedMetadata
     */
    const {
      trim: { frames },
      ...exportedMetadata
    } = /** @type {ExportedMetadata} */ (exportMetadata);
    const audioBuffer = await getSourceAudioBuffer(
      exportMetadata.sourceFileId,
      false
    );
    const waveformPeaks = await getSamplePeaksForAudioBuffer(
      audioBuffer,
      frames
    );
    /**
     * @type {OldMetadata & {
     *   trim: TrimInfo & { waveformPeaks: SamplePeaks }
     * }}
     */
    const oldMetadata = {
      ...exportedMetadata,
      trim: {
        frames,
        waveformPeaks,
      },
    };
    return oldMetadata;
  },
  '0.7.0': (exportMetadata) => {
    return exportMetadataToOldMetadata['0.6.0'](exportMetadata);
  },
  '0.8.0': async (exportMetadata) => {
    /**
     * @typedef {SampleMetadataExport & {
     *   trim: TrimInfo
     * }} ExportedMetadata
     */
    const exportedMetadata = /** @type {ExportedMetadata} */ (exportMetadata);
    const audioBuffer = await getSourceAudioBuffer(
      exportMetadata.sourceFileId,
      false
    );
    const waveformPeaks = await getSamplePeaksForAudioBuffer(
      audioBuffer,
      exportedMetadata.trim.frames
    );
    /** @type {CachedInfo} */
    const cachedInfo = {
      waveformPeaks,
      duration:
        audioBuffer.duration -
        (exportedMetadata.trim.frames[0] + exportedMetadata.trim.frames[1]) /
          SAMPLE_RATE,
      srcDuration: audioBuffer.duration,
    };
    /**
     * @type {OldMetadata & {
     *   cachedInfo: CachedInfo
     * }}
     */
    const oldMetadata = {
      ...exportedMetadata,
      cachedInfo,
    };
    return oldMetadata;
  },
};

let isReloadedToUpgrade =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('reloaded_to_upgrade');

function reloadToUpgrade() {
  const newUrl = new URL(window.location.href);
  const newSearchParams = new URLSearchParams(window.location.search);
  newSearchParams.set('reloaded_to_upgrade', 'true');
  newUrl.search = newSearchParams.toString();
  window.location.replace(newUrl.href);
}

function clearReloadToUpgrade() {
  const newUrl = new URL(window.location.href);
  const newSearchParams = new URLSearchParams(window.location.search);
  newSearchParams.delete('reloaded_to_upgrade');
  newUrl.search = newSearchParams.toString();
  window.history.replaceState({}, '', newUrl);
  isReloadedToUpgrade = false;
}

/**
 * @param {OldMetadata} oldMetadata
 * @param {boolean} [noReload]
 * @returns {Promise<SampleMetadata>}
 */
async function upgradeMetadata(oldMetadata, noReload) {
  let prevMetadata = oldMetadata;
  while (prevMetadata.metadataVersion !== METADATA_VERSION) {
    /**
     * @type {(typeof metadataUpgrades)[string] | undefined}
     */
    const matchedUpgrade = metadataUpgrades[prevMetadata.metadataVersion];
    if (!matchedUpgrade) {
      if (noReload) {
        throw new Error('Could not upgrade');
      }
      if (!isReloadedToUpgrade) {
        reloadToUpgrade();
      }
      console.warn(
        `Failed to properly upgrade metadata for sample "${prevMetadata.name}"`
      );
      prevMetadata = {
        name: prevMetadata.name,
        sourceFileId: prevMetadata.sourceFileId,
        metadataVersion: METADATA_VERSION,
      };
      break;
    }
    prevMetadata = await matchedUpgrade(prevMetadata);
  }
  return /** @type {SampleMetadata} */ (/** @type {unknown} */ (prevMetadata));
}

export class SampleContainer {
  /**
   * @param {SampleContainerParams} sampleContainerParams
   */
  constructor({
    name,
    sourceFileId,
    trim,
    cachedInfo,
    id = uuidv4(),
    userFileInfo = null,
    slotNumber = 0,
    dateSampled = new Date().toISOString(),
    dateModified = dateSampled,
    useCompression = true,
    qualityBitDepth = 16,
    normalize = 'selection',
    pitchAdjustment = 1,
  }) {
    /** @readonly */
    this.id = id;
    /**
     * @readonly
     * @type {SampleMetadata}
     */
    this.metadata = {
      name,
      sourceFileId,
      trim,
      cachedInfo,
      userFileInfo,
      slotNumber,
      dateSampled,
      dateModified,
      useCompression,
      qualityBitDepth,
      normalize,
      pitchAdjustment,
      metadataVersion: METADATA_VERSION,
    };
  }

  /**
   * @returns {SampleContainer}
   * @param {(sampleId: string) => void} [onPersisted]
   */
  duplicate(onPersisted) {
    const copy = new SampleContainer.Mutable({
      ...this.metadata,
      name: `${this.metadata.name} (copy)`,
      dateModified: new Date().toISOString(),
    });
    // async - does not block
    copy.persist().then(() => onPersisted && onPersisted(copy.id));
    return copy;
  }

  static Mutable = class MutableSampleContainer extends SampleContainer {
    /**
     * @param {SampleContainerParams} sampleContainerParams
     */
    constructor(sampleContainerParams) {
      super(sampleContainerParams);
      setTimeout(async () => {
        const ids = await sampleMetadataStore.keys();
        if (!ids.includes(this.id)) {
          console.warn(
            `Expected sample metadata container ${this.id} to be persisted`
          );
        }
      });
    }

    async persist() {
      await sampleMetadataStore.setItem(this.id, this.metadata);
    }

    /**
     * @param {SampleMetadataUpdateArg} updater
     * @param {() => void} [onPersisted]
     * @returns {SampleContainer}
     */
    update(updater, onPersisted) {
      const { id, metadata } = this;
      const update =
        typeof updater === 'function' ? updater(metadata) : updater;
      // if the update doesn't change anything, return the existing container
      if (
        /** @type {(keyof SampleMetadataUpdate)[]} */ (
          Object.keys(update)
        ).every((key) => update[key] === metadata[key])
      ) {
        return this;
      }
      /**
       * @type {SampleMetadata}
       */
      const newMetadata = {
        ...metadata,
        ...update,
        dateModified: new Date().toISOString(),
      };
      const newContainer = new SampleContainer.Mutable({ id, ...newMetadata });
      // async - does not block
      newContainer.persist().then(onPersisted);
      return newContainer;
    }

    async remove() {
      await sampleMetadataStore.removeItem(this.id);
      // if the source file is on the server, don't worry about cleanup
      if (this.metadata.sourceFileId.includes('.')) {
        return;
      }
      // check if source file is used by other sample containers
      const allMetadata = await SampleContainer.getAllMetadataFromStore();
      for (const [, { sourceFileId }] of allMetadata) {
        if (sourceFileId === this.metadata.sourceFileId) {
          // still used.. don't do anything
          return;
        }
      }
      // clean up dangling source file from storage
      await audioFileDataStore.removeItem(this.metadata.sourceFileId);
    }
  };

  /**
   * @private
   * @type {Map<string, Uint8Array>}
   */
  static sourceFileData = new Map();

  /**
   * @private
   * @type {string[]}
   */
  static recentlyCachedSourceFileIds = [];

  /** @readonly @private */
  static MAX_CACHED = 10;

  /**
   * @param {string} sourceFileId
   * @param {Uint8Array} data
   */
  static cacheSourceFileData(sourceFileId, data) {
    this.sourceFileData.set(sourceFileId, data);
    this.recentlyCachedSourceFileIds = [
      sourceFileId,
      ...this.recentlyCachedSourceFileIds.filter((id) => id !== sourceFileId),
    ];
    const stale = this.recentlyCachedSourceFileIds.slice(this.MAX_CACHED);
    for (const sourceFileId of stale) {
      this.sourceFileData.delete(sourceFileId);
    }
    this.recentlyCachedSourceFileIds = this.recentlyCachedSourceFileIds.slice(
      0,
      this.MAX_CACHED
    );
  }

  /**
   * @param {string} sourceFileId
   * @param {boolean} [noCache]
   * @returns {Promise<Uint8Array>}
   */
  static async getSourceFileData(sourceFileId, noCache) {
    if (!noCache) {
      const data = this.sourceFileData.get(sourceFileId);
      if (data) {
        return data;
      }
    }
    if (sourceFileId.includes('.')) {
      // assume it's a URL pointing to a an audio file
      const res = await fetch(sourceFileId);
      if (res.status >= 400) {
        return Promise.reject(
          new Error(`Failed to fetch source file "${sourceFileId}"`)
        );
      }
      const buffer = await res.arrayBuffer();
      const data = new Uint8Array(buffer);
      if (!noCache) {
        this.cacheSourceFileData(sourceFileId, data);
      }
      return data;
    }
    /**
     * @type {unknown}
     */
    const data = await audioFileDataStore.getItem(sourceFileId);
    if (data) {
      if (data instanceof Uint8Array) {
        if (!noCache) {
          this.cacheSourceFileData(sourceFileId, data);
        }
        return data;
      }
      return Promise.reject('Source data is of unexpected type');
    }
    return Promise.reject('Missing source data');
  }

  /**
   * @protected
   */
  static async getAllMetadataFromStore() {
    /**
     * @type {Map<string, SampleMetadata>}
     */
    const sampleMetadata = new Map();
    /**
     * @type {Promise<void>[]}
     */
    const upgradePromises = [];
    await sampleMetadataStore.iterate((metadata, id) => {
      if (metadata) {
        upgradePromises.push(
          upgradeMetadata(metadata)
            .then((upgradedMetadata) => {
              sampleMetadata.set(id, upgradedMetadata);
            })
            .catch((err) => {
              console.error(err);
              console.warn(
                `Failed to upgrade metadata "${id}" (${metadata.name}); ignoring.`
              );
            })
        );
      }
    });
    await Promise.all(upgradePromises);
    if (isReloadedToUpgrade) {
      clearReloadToUpgrade();
    }
    return sampleMetadata;
  }

  static async getAllFromStorage() {
    const sampleMetadata = await this.getAllMetadataFromStore();
    const factorySampleParams = await getFactorySampleParams();
    const sourceIds = (await audioFileDataStore.keys()).concat(
      factorySampleParams.map(({ sourceFileId }) => sourceFileId)
    );
    const sampleContainers = /** @type {SampleContainer[]} */ (
      [...sampleMetadata]
        .map(([id, metadata]) => {
          const { sourceFileId } = metadata;
          if (!sourceIds.includes(sourceFileId)) {
            console.warn(
              `Found metadata "${
                metadata.name || id
              }" with missing data "${sourceFileId}; ignoring.`
            );
            return null;
          }
          return new SampleContainer.Mutable({ id, ...metadata });
        })
        .filter(Boolean)
    ).sort(sampleContainerDateCompare);
    return sampleContainers;
  }

  /**
   * @param {string[]} sampleIds
   * @return {Promise<SampleContainer[]>}
   */
  static async getByIdsFromStorage(sampleIds) {
    return Promise.all(
      sampleIds.map(async (sampleId) => {
        const metadata = await sampleMetadataStore.getItem(sampleId);
        const upgradedMetadata = await upgradeMetadata(metadata);
        const sampleContainer = new SampleContainer.Mutable({
          id: sampleId,
          ...upgradedMetadata,
        });
        const { sourceFileId } = sampleContainer.metadata;
        this.recentlyCachedSourceFileIds.filter((id) => id !== sourceFileId);
        this.sourceFileData.delete(sourceFileId);
        if (isReloadedToUpgrade) {
          clearReloadToUpgrade();
        }
        return sampleContainer;
      })
    );
  }

  /**
   * @param {string} sampleId
   * @param {SampleMetadataExport} exportMetadata
   * @return {Promise<SampleContainer>}
   */
  static async importToStorage(sampleId, exportMetadata) {
    const toOldMetadata =
      exportMetadataToOldMetadata[exportMetadata.metadataVersion];
    if (!toOldMetadata) {
      console.error('Failed to import metadata', exportMetadata);
      throw new Error('Failed to import metadata with no import migration');
    }
    const oldMetadata = await toOldMetadata(exportMetadata);
    const upgradedMetadata = await upgradeMetadata(oldMetadata, true);
    const sampleContainer = new SampleContainer.Mutable({
      id: sampleId,
      ...upgradedMetadata,
    });
    await sampleContainer.persist();
    return sampleContainer;
  }
}

/**
 * @type {Promise<import('../public/factory-samples.json')> | undefined}
 */
let factorySampleParamsPromise;
function getFactorySampleParams() {
  if (!factorySampleParamsPromise) {
    factorySampleParamsPromise = fetch('factory-samples.json').then((res) =>
      res.json()
    );
  }
  return factorySampleParamsPromise;
}

export async function getFactorySamples() {
  const factorySampleParams = await getFactorySampleParams();
  return new Map(
    factorySampleParams.map((params) => [
      params.id,
      new SampleContainer({
        ...params,
        normalize: null,
        trim: {
          frames: [params.trim.frames[0], params.trim.frames[1]],
        },
        cachedInfo: {
          waveformPeaks: {
            positive: new Float32Array(
              decodeBase64(params.cachedInfo.waveformPeaks.positive)
            ),
            negative: new Float32Array(
              decodeBase64(params.cachedInfo.waveformPeaks.negative)
            ),
            normalizationCoefficient:
              params.cachedInfo.waveformPeaks.normalizationCoefficient,
          },
          duration: params.cachedInfo.duration,
          srcDuration: params.cachedInfo.srcDuration,
        },
      }),
    ])
  );
}

/**
 * @param {SampleContainer} a
 * @param {SampleContainer} b
 */
export function sampleContainerDateCompare(a, b) {
  return a.metadata.dateModified > b.metadata.dateModified
    ? -1
    : b.metadata.dateModified > a.metadata.dateModified
    ? 1
    : 0;
}

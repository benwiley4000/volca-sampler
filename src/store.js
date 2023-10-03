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
 *   waveformPeaks: import('./utils/waveform').SamplePeaks;
 * }} TrimInfo
 */

/**
 * @typedef {object} SampleContainerParams
 * @property {string} name
 * @property {string} sourceFileId
 * @property {TrimInfo} trim
 * @property {string} [id]
 * @property {{ type: string; ext: string } | null} [userFileInfo]
 * @property {number} [slotNumber]
 * @property {string} [dateSampled]
 * @property {string} [dateModified]
 * @property {boolean} [useCompression]
 * @property {number} [qualityBitDepth]
 * @property {boolean} [normalize]
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
 * @property {boolean} normalize
 * @property {string} metadataVersion
 */

/**
 * @typedef {object} SampleMetadataUpdate
 * @property {string} [name]
 * @property {TrimInfo} [trim]
 * @property {number} [slotNumber]
 * @property {boolean} [useCompression]
 * @property {number} [qualityBitDepth]
 * @property {boolean} [normalize]
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

/**
 * @param {Uint8Array} audioFileData
 * @returns {Promise<string>} id
 */
export async function storeAudioSourceFile(audioFileData) {
  const id = uuidv4();
  await audioFileDataStore.setItem(id, audioFileData);
  return id;
}

const METADATA_VERSION = '0.5.0';

// These properties are considered fundamental and should never break
/**
 * @typedef {{
 *   name: string;
 *   sourceFileId: string;
 *   id: string;
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
     * @type {TrimInfo}
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
     *   trim: Omit<TrimInfo, 'waveformPeaks'> & {
     *     waveformPeaks: Omit<
     *       TrimInfo['waveformPeaks'],
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
};

let isReloadedToUpgrade = new URLSearchParams(window.location.search).has(
  'reloaded_to_upgrade'
);

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
 * @returns {Promise<SampleMetadata>}
 */
async function upgradeMetadata(oldMetadata) {
  let prevMetadata = oldMetadata;
  while (prevMetadata.metadataVersion !== METADATA_VERSION) {
    /**
     * @type {(typeof metadataUpgrades)[string] | undefined}
     */
    const matchedUpgrade = metadataUpgrades[prevMetadata.metadataVersion];
    if (!matchedUpgrade) {
      if (!isReloadedToUpgrade) {
        reloadToUpgrade();
      }
      console.warn(
        `Failed to properly upgrade metadata for sample "${prevMetadata.name}"`
      );
      prevMetadata = {
        name: prevMetadata.name,
        sourceFileId: prevMetadata.sourceFileId,
        id: prevMetadata.id,
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
    id = uuidv4(),
    userFileInfo = null,
    slotNumber = 0,
    dateSampled = new Date().toISOString(),
    dateModified = dateSampled,
    useCompression = true,
    qualityBitDepth = 16,
    normalize = true,
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
      userFileInfo,
      slotNumber,
      dateSampled,
      dateModified,
      useCompression,
      qualityBitDepth,
      normalize,
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

  static Mutable = class extends SampleContainer {
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
   * @returns {Promise<Uint8Array>}
   */
  static async getSourceFileData(sourceFileId) {
    {
      const data = this.sourceFileData.get(sourceFileId);
      if (data) {
        return data;
      }
    }
    if (sourceFileId.includes('.')) {
      const res = await fetch(sourceFileId);
      if (res.status >= 400) {
        return Promise.reject(
          new Error(`Failed to fetch source file "${sourceFileId}"`)
        );
      }
      // assume it's a URL pointing to a an audio file
      const buffer = await res.arrayBuffer();
      const data = new Uint8Array(buffer);
      this.cacheSourceFileData(sourceFileId, data);
      return data;
    }
    /**
     * @type {unknown}
     */
    const data = await audioFileDataStore.getItem(sourceFileId);
    if (data) {
      if (data instanceof Uint8Array) {
        this.cacheSourceFileData(sourceFileId, data);
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
    ).sort(
      ({ metadata: { dateModified: a } }, { metadata: { dateModified: b } }) =>
        a > b ? -1 : b > a ? 1 : 0
    );
    return sampleContainers;
  }

  /**
   * @param {string} sampleId
   * @return {Promise<SampleContainer>}
   */
  static async getOneFromStorage(sampleId) {
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
        normalize: false,
        trim: {
          frames: [params.trim.frames[0], params.trim.frames[1]],
          waveformPeaks: {
            ...params.trim.waveformPeaks,
            positive: new Float32Array(
              decodeBase64(params.trim.waveformPeaks.positive)
            ),
            negative: new Float32Array(
              decodeBase64(params.trim.waveformPeaks.negative)
            ),
          },
        },
      }),
    ])
  );
}

// @ts-check

import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {object} SampleContainerParams
 * @property {string} name
 * @property {string} sourceFileId
 * @property {string} [id]
 * @property {number} [slotNumber]
 * @property {number} [dateSampled]
 * @property {number} [dateModified]
 * @property {boolean} [useCompression]
 * @property {number} [qualityBitDepth]
 * @property {number | false} [normalize]
 * @property {[number, number]} [clip]
 */

/**
 * @typedef {object} SampleMetadata
 * @property {string} name
 * @property {string} sourceFileId
 * @property {number} slotNumber
 * @property {number} dateSampled
 * @property {number} dateModified
 * @property {boolean} useCompression
 * @property {number} qualityBitDepth
 * @property {number | false} normalize
 * @property {[number, number]} clip
 * @property {string} metadataVersion
 */

/**
 * @typedef {object} SampleMetadataUpdate
 * @property {string} [name]
 * @property {number} [slotNumber]
 * @property {boolean} [useCompression]
 * @property {number} [qualityBitDepth]
 * @property {number | false} [normalize]
 * @property {[number, number]} [clip]
 */

const wavDataStore = localforage.createInstance({
  name: 'wav_data',
  driver: localforage.INDEXEDDB,
});

const sampleMetadataStore = localforage.createInstance({
  name: 'sample_metadata',
  driver: localforage.INDEXEDDB,
});

/**
 * @param {Uint8Array} wavData
 * @returns {Promise<string>} id
 */
export async function storeWavSourceFile(wavData) {
  const id = uuidv4();
  await wavDataStore.setItem(id, wavData);
  return id;
}

const METADATA_VERSION = '0.1.0';

export class SampleContainer {
  /**
   * @param {SampleContainerParams} sampleContainerParams
   */
  constructor({
    name,
    sourceFileId,
    id = uuidv4(),
    slotNumber = 0,
    dateSampled = Date.now(),
    dateModified = dateSampled,
    useCompression = false,
    qualityBitDepth = 16,
    normalize = false,
    clip = [0, 0],
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
      slotNumber,
      dateSampled,
      dateModified,
      useCompression,
      qualityBitDepth,
      normalize,
      clip,
      metadataVersion: METADATA_VERSION,
    };
    setTimeout(async () => {
      const ids = await sampleMetadataStore.keys();
      if (!ids.includes(this.id)) {
        console.warn(
          `Expected sample metadata container ${this.id} to be persisted`
        );
      }
    });
  }

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
   * @returns {Promise<Uint8Array>}
   */
  async getSourceFileData() {
    const { sourceFileId } = this.metadata;
    if (SampleContainer.sourceFileData.has(sourceFileId)) {
      return SampleContainer.sourceFileData.get(sourceFileId);
    }
    /**
     * @type {unknown}
     */
    const data = await wavDataStore.getItem(sourceFileId);
    if (data) {
      if (data instanceof Uint8Array) {
        SampleContainer.cacheSourceFileData(sourceFileId, data);
        return data;
      }
      return Promise.reject('Source data is of unexpected type');
    }
    return Promise.reject('Missing source data');
  }

  async persist() {
    await sampleMetadataStore.setItem(this.id, this.metadata);
  }

  /**
   * @param {SampleMetadataUpdate} update
   */
  update(update) {
    const { id, metadata } = this;
    /**
     * @type {SampleMetadata}
     */
    const newMetadata = {
      ...metadata,
      ...update,
      dateModified: Date.now(),
    };
    const newContainer = new SampleContainer({ id, ...newMetadata });
    // async - does not block
    newContainer.persist();
    return newContainer;
  }

  duplicate() {
    const copy = new SampleContainer({
      ...this.metadata,
      name: `${this.metadata.name} (copy)`,
      dateModified: Date.now(),
    });
    // async - does not block
    copy.persist();
    return copy;
  }

  async remove() {
    await sampleMetadataStore.removeItem(this.id);
  }

  static async getAllFromStorage() {
    /**
     * @type {Map<string, SampleMetadata>}
     */
    const sampleMetadata = new Map();
    await sampleMetadataStore.iterate((metadata, id) => {
      if (metadata && metadata.metadataVersion === METADATA_VERSION) {
        sampleMetadata.set(id, metadata);
      } else {
        // TODO: handle upgrade
        console.warn(
          `Found metadata "${metadata.name || id} with unhandled version ${
            metadata.metadataVersion
          }"; ignoring.`
        );
      }
    });
    const sourceIds = await wavDataStore.keys();
    const sampleContainers = [...sampleMetadata]
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
        return new SampleContainer({ id, ...metadata });
      })
      .filter(Boolean)
      .sort((a, b) => b.metadata.dateSampled - a.metadata.dateSampled);
    return sampleContainers;
  }
}

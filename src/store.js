import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

import factorySampleParams from './factory-samples.json';

/**
 * @typedef {object} SampleContainerParams
 * @property {string} name
 * @property {string} sourceFileId
 * @property {string} [id]
 * @property {{ type: string; ext: string } | null} [userFileInfo]
 * @property {number} [slotNumber]
 * @property {number} [dateSampled]
 * @property {number} [dateModified]
 * @property {boolean} [useCompression]
 * @property {number} [qualityBitDepth]
 * @property {number} [scaleCoefficient]
 * @property {[number, number]} [clip]
 */

/**
 * @typedef {object} SampleMetadata
 * @property {string} name
 * @property {string} sourceFileId
 * @property {{ type: string; ext: string } | null} userFileInfo
 * @property {number} slotNumber
 * @property {number} dateSampled
 * @property {number} dateModified
 * @property {boolean} useCompression
 * @property {number} qualityBitDepth
 * @property {number} scaleCoefficient
 * @property {[number, number]} clip
 * @property {string} metadataVersion
 */

/**
 * @typedef {object} SampleMetadataUpdate
 * @property {string} [name]
 * @property {number} [slotNumber]
 * @property {boolean} [useCompression]
 * @property {number} [qualityBitDepth]
 * @property {number} [scaleCoefficient]
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
    userFileInfo = null,
    slotNumber = 0,
    dateSampled = Date.now(),
    dateModified = dateSampled,
    useCompression = false,
    qualityBitDepth = 16,
    scaleCoefficient = 1,
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
      userFileInfo,
      slotNumber,
      dateSampled,
      dateModified,
      useCompression,
      qualityBitDepth,
      scaleCoefficient,
      clip,
      metadataVersion: METADATA_VERSION,
    };
  }

  /**
   * @returns {SampleContainer}
   */
  duplicate() {
    const copy = new SampleContainer.Mutable({
      ...this.metadata,
      name: `${this.metadata.name} (copy)`,
      dateModified: Date.now(),
    });
    // async - does not block
    copy.persist();
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
     * @param {SampleMetadataUpdate} update
     * @returns {SampleContainer}
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
      const newContainer = new SampleContainer.Mutable({ id, ...newMetadata });
      // async - does not block
      newContainer.persist();
      return newContainer;
    }

    async remove() {
      await sampleMetadataStore.removeItem(this.id);
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
      // assume it's a URL pointing to a WAV file
      const buffer = await (await fetch(sourceFileId)).arrayBuffer();
      const data = new Uint8Array(buffer);
      this.cacheSourceFileData(sourceFileId, data);
      return data;
    }
    /**
     * @type {unknown}
     */
    const data = await wavDataStore.getItem(sourceFileId);
    if (data) {
      if (data instanceof Uint8Array) {
        this.cacheSourceFileData(sourceFileId, data);
        return data;
      }
      return Promise.reject('Source data is of unexpected type');
    }
    return Promise.reject('Missing source data');
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
    const sourceIds = (await wavDataStore.keys()).concat(
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
    ).sort((a, b) => b.metadata.dateModified - a.metadata.dateModified);
    return sampleContainers;
  }
}

export const factorySamples = new Map(
  factorySampleParams.map((params) => [params.id, new SampleContainer(params)])
);

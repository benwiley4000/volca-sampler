import localforage from 'localforage';
import { useEffect, useState } from 'react';
import {
  PluginRunError,
  getAudioBufferForAudioFileData,
  getSourceAudioBuffer,
  getTargetWavForSample,
} from './utils/audioData';
import { getSamplePeaksForAudioBuffer } from './utils/waveform';
import { SAMPLE_RATE } from './utils/constants';

/** @typedef {import('./store').SampleContainer} SampleContainer */

/**
 * @typedef {{
 *   waveformPeaks: import('./utils/waveform').SamplePeaks;
 *   duration: number;
 *   failedPluginIndex: number; // index of failed plugin, -1 if all good
 * }} CachedInfo
 */

const sampleCachedInfoStore = localforage.createInstance({
  name: 'sample_cached_info',
  driver: localforage.INDEXEDDB,
});

export class SampleCache {
  /**
   * @param {{
   *   sampleContainer: SampleContainer;
   *   cachedInfo: CachedInfo
   * }} params
   */
  constructor({ sampleContainer, cachedInfo }) {
    /** @readonly */
    this.sampleContainer = sampleContainer;
    /**
     * @readonly
     * @type {CachedInfo}
     */
    this.cachedInfo = cachedInfo;
  }

  getPreviewAudio() {
    return SampleCache.getPreviewAudioData(this.sampleContainer);
  }

  static Mutable = class MutableSampleCache extends SampleCache {
    /** @protected */
    showPersistenceWarning = true;

    /**
     * @param {{
     *   sampleContainer: SampleContainer; cachedInfo: CachedInfo
     * }} params
     */
    constructor({ sampleContainer, cachedInfo }) {
      super({ sampleContainer, cachedInfo });
      setTimeout(async () => {
        if (this.showPersistenceWarning) {
          const ids = await sampleCachedInfoStore.keys();
          if (!ids.includes(this.sampleContainer.id)) {
            console.warn(
              `Expected cache for sample ${this.sampleContainer.id} to be persisted`
            );
          }
        }
      });
    }

    /**
     * For new cached info freshly migrated from an older sample metadata
     * version, we don't want to persist it until it's updated.
     */
    static Upgraded = class UpgradedMutableSampleCache extends MutableSampleCache {
      showPersistenceWarning = false;
    };

    async persist() {
      await sampleCachedInfoStore.setItem(
        this.sampleContainer.id,
        this.cachedInfo
      );
    }

    /**
     * @param {import('./store').SampleContainer} sampleContainer
     * @returns {Promise<SampleCache>}
     */
    async update(sampleContainer) {
      if (sampleContainer === this.sampleContainer) {
        return this;
      }
      /** @type {CachedInfo} */
      let cachedInfo;
      try {
        const { data, cachedInfo: _cachedInfo } = await getTargetWavForSample(
          sampleContainer,
          true
        );
        await SampleCache.cachePreviewAudioData(sampleContainer.id, data);
        cachedInfo = _cachedInfo;
      } catch (err) {
        cachedInfo = {
          ...this.cachedInfo,
          failedPluginIndex:
            err instanceof PluginRunError ? err.pluginIndex : -1,
        };
      }
      const newSampleCache = new SampleCache.Mutable({
        sampleContainer,
        cachedInfo,
      });
      await newSampleCache.persist();
      return newSampleCache;
    }

    async remove() {
      await sampleCachedInfoStore.removeItem(this.sampleContainer.id);
    }
  };

  /**
   * @private
   * @type {Map<string, Uint8Array>}
   */
  static previewWavData = new Map();

  /**
   * @private
   * @type {Map<string, AudioBuffer>}
   */
  static previewAudioBuffers = new Map();

  /**
   * @private
   * @type {string[]}
   */
  static recentlyBufferedSampleIds = [];

  /** @readonly @private */
  static MAX_CACHED = 10;

  /**
   * @private
   * @param {string} sampleId
   * @param {Uint8Array} wavData
   */
  static async cachePreviewAudioData(sampleId, wavData) {
    const audioBuffer = await getAudioBufferForAudioFileData(wavData);
    this.previewWavData.set(sampleId, wavData);
    this.previewAudioBuffers.set(sampleId, audioBuffer);
    this.recentlyBufferedSampleIds = [
      sampleId,
      ...this.recentlyBufferedSampleIds.filter((id) => id !== sampleId),
    ];
    const stale = this.recentlyBufferedSampleIds.slice(this.MAX_CACHED);
    for (const sampleId of stale) {
      this.previewWavData.delete(sampleId);
      this.previewAudioBuffers.delete(sampleId);
    }
    this.recentlyBufferedSampleIds = this.recentlyBufferedSampleIds.slice(
      0,
      this.MAX_CACHED
    );
  }

  /**
   * @private
   * @param {SampleContainer} sampleContainer
   * @returns {Promise<{ wavData: Uint8Array; audioBuffer: AudioBuffer }>}
   */
  static async getPreviewAudioData(sampleContainer) {
    let wavData = this.previewWavData.get(sampleContainer.id);
    let audioBuffer = this.previewAudioBuffers.get(sampleContainer.id);
    if (!wavData) {
      audioBuffer = undefined;
      const { data } = await getTargetWavForSample(sampleContainer, true);
      wavData = data;
    }
    if (!audioBuffer) {
      audioBuffer = await getAudioBufferForAudioFileData(wavData);
    }
    this.previewWavData.set(sampleContainer.id, wavData);
    this.previewAudioBuffers.set(sampleContainer.id, audioBuffer);
    return {
      wavData,
      audioBuffer,
    };
  }

  static async getAllCachedInfoFromStore() {
    /**
     * @type {Map<string, CachedInfo>}
     */
    const cachedInfoMap = new Map();
    await sampleCachedInfoStore.iterate((cachedInfo, id) => {
      try {
        if (
          cachedInfo.waveformPeaks &&
          cachedInfo.waveformPeaks.positive instanceof Float32Array &&
          cachedInfo.waveformPeaks.negative instanceof Float32Array &&
          cachedInfo.duration
        ) {
          cachedInfoMap.set(id, cachedInfo);
        }
      } catch (err) {
        console.error(err);
      }
    });
    return cachedInfoMap;
  }

  /**
   * @param {string[]} sampleIds
   * @return {Promise<CachedInfo[]>}
   */
  static async getCachedInfoByIdsFromStorage(sampleIds) {
    return Promise.all(
      sampleIds.map((sampleId) => {
        return sampleCachedInfoStore.getItem(sampleId);
      })
    );
  }

  /**
   * @param {SampleContainer} sampleContainer
   * @return {Promise<SampleCache>}
   */
  static async importToStorage(sampleContainer) {
    /** @type {CachedInfo} */
    let cachedInfo;
    try {
      // first try to compute cached info using plugins
      const { cachedInfo: _cachedInfo } = await getTargetWavForSample(
        sampleContainer,
        true
      );
      cachedInfo = _cachedInfo;
    } catch (err) {
      // if something breaks then compute the info ignoring plugins
      const audioBuffer = await getSourceAudioBuffer(
        sampleContainer.metadata.sourceFileId,
        false
      );
      const waveformPeaks = await getSamplePeaksForAudioBuffer(
        audioBuffer,
        sampleContainer.metadata.trim.frames
      );
      const { frames } = sampleContainer.metadata.trim;
      const { pitchAdjustment } = sampleContainer.metadata;
      cachedInfo = {
        waveformPeaks,
        duration:
          (audioBuffer.duration - (frames[0] + frames[1]) / SAMPLE_RATE) /
          pitchAdjustment,
        failedPluginIndex: err instanceof PluginRunError ? err.pluginIndex : -1,
      };
    }
    const newSampleCache = new SampleCache.Mutable({
      sampleContainer,
      cachedInfo,
    });
    await newSampleCache.persist();
    return newSampleCache;
  }
}

/**
 * @param {SampleCache | null} sampleCache
 * @param {boolean} [isRequested]
 */
export function usePreviewAudio(sampleCache, isRequested = true) {
  const [previewAudio, setPreviewAudio] = useState(
    /** @type {Partial<Awaited<ReturnType<SampleCache['getPreviewAudio']>>>} */ ({})
  );
  useEffect(() => {
    if (isRequested) {
      sampleCache?.getPreviewAudio().then(setPreviewAudio);
    }
  }, [sampleCache, isRequested]);
  return previewAudio;
}

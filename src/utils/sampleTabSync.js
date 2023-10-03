const SAMPLE_UPDATE_EVENT_NAME = 'sampleUpdateEvent';

/**
 * @typedef {object} SampleUpdateEvent
 * @property {string} sampleId
 * @property {'create' | 'edit' | 'delete'} action
 * @property {number} when
 */

/**
 * @param {string} sampleId
 * @param {SampleUpdateEvent['action']} action
 */
export function sendSampleUpdateEvent(sampleId, action) {
  /** @type {SampleUpdateEvent} */
  const event = { sampleId, action, when: Date.now() };
  localStorage.setItem(SAMPLE_UPDATE_EVENT_NAME, JSON.stringify(event));
}

/**
 *
 * @param {(event: SampleUpdateEvent) => void} callback
 */
export function onSampleUpdateEvent(callback) {
  /** @param {StorageEvent} e */
  function onStorageEvent(e) {
    if (e.key === SAMPLE_UPDATE_EVENT_NAME && e.newValue) {
      /** @type {SampleUpdateEvent} */
      const event = JSON.parse(e.newValue);
      callback(event);
    }
  }
  window.addEventListener('storage', onStorageEvent);
  return () => {
    window.removeEventListener('storage', onStorageEvent);
  };
}

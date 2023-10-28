const TAB_UPDATE_EVENT_NAME = 'tabUpdateEvent';

/**
 * @typedef {object} TabUpdateEvent
 * @property {'sample' | 'cache' | 'plugin'} dataType
 * @property {string[]} ids
 * @property {'create' | 'edit' | 'delete'} action
 * @property {number} when
 */

/**
 * @param {TabUpdateEvent['dataType']} dataType
 * @param {TabUpdateEvent['ids']} ids
 * @param {TabUpdateEvent['action']} action
 */
export function sendTabUpdateEvent(dataType, ids, action) {
  /** @type {TabUpdateEvent} */
  const event = { dataType, ids, action, when: Date.now() };
  localStorage.setItem(TAB_UPDATE_EVENT_NAME, JSON.stringify(event));
}

/**
 * @param {TabUpdateEvent['dataType']} dataType
 * @param {(event: TabUpdateEvent) => void} callback
 */
export function onTabUpdateEvent(dataType, callback) {
  /** @param {StorageEvent} e */
  function onStorageEvent(e) {
    if (e.key === TAB_UPDATE_EVENT_NAME && e.newValue) {
      /** @type {TabUpdateEvent} */
      const event = JSON.parse(e.newValue);
      if (event.dataType === dataType) {
        callback(event);
      }
    }
  }
  window.addEventListener('storage', onStorageEvent);
  return () => {
    window.removeEventListener('storage', onStorageEvent);
  };
}

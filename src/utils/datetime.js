/**
 * @param {Date} date
 */
export function formatDate(date) {
  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * @param {number} sec
 * @param {number} decimals
 */
export function formatShortTime(sec, decimals) {
  return `0:${sec.toFixed(decimals).padStart(3 + decimals, '0')}`;
}

/**
 * @param {number} sec
 */
export function formatLongTime(sec) {
  return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
}

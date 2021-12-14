/**
 * @param {Date} date 
 */
export function formatDate(date) {
  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}
/**
 * @type {'windows' | 'mac' | 'linux' | 'ios' | 'android'}
 */
export const userOS = (() => {
  const userAgentString = navigator.userAgent.toLowerCase();
  if (
    userAgentString.includes('iphone') ||
    userAgentString.includes('ipad') ||
    (userAgentString.includes('mac') && navigator.maxTouchPoints > 1)
  ) {
    return 'ios';
  }
  if (userAgentString.includes('android')) {
    return 'android';
  }
  if (userAgentString.includes('mac')) {
    return 'mac';
  }
  if (userAgentString.includes('linux')) {
    return 'linux';
  }
  return 'windows';
})();

import { v4 as uuidv4 } from 'uuid';

const PLUGIN_TIMEOUT = 10;

const IFRAME_ORIGIN =
  window.location.protocol === 'http:'
    ? 'http://localhost:3001'
    : `https://plugin.${window.location.host}`;

const iframeParent = document.createElement('div');
document.body.appendChild(iframeParent);

/**
 * @typedef {{ value: number; min: number; max: number }} PluginParamDef
 * @typedef {Record<string, PluginParamDef>} PluginParamsDef
 * @typedef {Record<string, number>} PluginParams
 */

/** @type {Record<string, Promise<PluginParamsDef>>} */
const pluginInstallPromises = {};

/**
 * @param {string} pluginName
 * @param {string} pluginSource
 */
export async function installPlugin(pluginName, pluginSource) {
  const iframe = document.createElement('iframe');
  iframe.id = pluginName;
  iframe.hidden = true;
  iframe.title = 'plugin-context';
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.src = `${IFRAME_ORIGIN}${window.location.pathname}plugin-context.html`;

  /** @type {(params: PluginParamsDef) => void} */
  let onInstalled = () => {};
  let onInstallError = () => {};
  pluginInstallPromises[pluginName] = new Promise((resolve, reject) => {
    onInstalled = resolve;
    onInstallError = reject;
  });

  iframeParent.appendChild(iframe);

  await new Promise((resolve) =>
    iframe.addEventListener('load', resolve, { once: true })
  );

  if (!iframe.contentWindow) {
    throw new Error('Expected iframe content window');
  }

  const messageId = uuidv4();
  iframe.contentWindow.postMessage(
    {
      messageType: 'pluginInstall',
      messageId,
      pluginSource,
    },
    '*'
  );

  /** @type {PluginParamsDef} */
  let pluginParamsDef = {};

  try {
    await /** @type {Promise<void>} */ (
      new Promise((resolve, reject) => {
        /** @type {ReturnType<typeof setTimeout>} */
        let timeout;

        /** @param {MessageEvent} event */
        const onMessage = ({ source, data }) => {
          if (source !== iframe.contentWindow) return;
          if (data.messageId !== messageId) return;
          if (data.messageType === 'receivedMessage') {
            timeout = setTimeout(() => {
              console.error('Plugin took too long to install:', pluginName);
              reject();
              window.removeEventListener('message', onMessage);
            }, PLUGIN_TIMEOUT);
            return;
          }
          if (data.messageType !== 'pluginInstall') return;
          if (data.error) {
            console.error('Plugin failed to install:', pluginName);
            reject();
          } else {
            pluginParamsDef = data.params;
            resolve();
          }
          clearTimeout(timeout);
          window.removeEventListener('message', onMessage);
        };

        window.addEventListener('message', onMessage);
      })
    );
  } catch (err) {
    onInstallError();
    iframeParent.removeChild(iframe);
    throw err;
  }

  onInstalled(pluginParamsDef);
}

/**
 * Perform a transform on a mono audio buffer using an iframe plugin
 * @param {HTMLIFrameElement} iframe
 * @param {AudioBuffer} audioBuffer
 * @param {PluginParams} params
 * @returns {Promise<AudioBuffer>} A transformed audio buffer
 */
async function sampleTransformPlugin(iframe, audioBuffer, params) {
  if (!iframe.contentWindow) {
    throw new Error('Expected iframe content window');
  }

  const audioData = audioBuffer.getChannelData(0);
  const { sampleRate } = audioBuffer;

  const messageId = uuidv4();
  iframe.contentWindow.postMessage(
    {
      messageType: 'sampleTransform',
      messageId,
      audioData,
      sampleRate,
      params,
    },
    '*'
  );

  /** @type {Float32Array} */
  let newAudioData;
  try {
    newAudioData = await /** @type {Promise<Float32Array>} */ (
      new Promise((resolve, reject) => {
        /** @type {ReturnType<typeof setTimeout>} */
        let timeout;

        /** @param {MessageEvent} event */
        const onMessage = ({ source, data }) => {
          if (source !== iframe.contentWindow) return;
          if (data.messageId !== messageId) return;
          if (data.messageType === 'receivedMessage') {
            timeout = setTimeout(() => {
              console.error('Plugin took too long to run:', iframe.id);
              reject(new Error('Plugin took too long to return'));
              window.removeEventListener('message', onMessage);
            }, PLUGIN_TIMEOUT);
            return;
          }
          if (data.messageType !== 'sampleTransform') return;
          if (data.error) {
            if (data.error === 'Invalid parameters') {
              console.error('Invalid plugin input:', iframe.id);
              reject(new Error('Invalid plugin input'));
            } else {
              console.error('Plugin call failed:', iframe.id);
              reject(new Error('Plugin failed to run'));
            }
          } else {
            resolve(data.newAudioData);
          }
          clearTimeout(timeout);
          window.removeEventListener('message', onMessage);
        };

        window.addEventListener('message', onMessage);
      })
    );
  } catch (err) {
    if (!(err instanceof Error && err.message === 'Invalid plugin input')) {
      iframe.dispatchEvent(new Event('uninstall', { bubbles: true }));
      iframeParent.removeChild(iframe);
    }
    throw err;
  }

  const newAudioBuffer = new AudioBuffer({
    length: newAudioData.length,
    sampleRate,
  });
  newAudioBuffer.copyToChannel(newAudioData, 0);

  return newAudioBuffer;
}

/**
 * @param {string} pluginName
 */
export function getPlugin(pluginName) {
  return {
    getParams() {
      return pluginInstallPromises[pluginName];
    },
    /**
     * @param {AudioBuffer} audioBuffer
     * @param {PluginParams} params
     */
    sampleTransform(audioBuffer, params) {
      let iframe = document.getElementById(pluginName);
      if (iframe && iframe instanceof HTMLIFrameElement) {
        return sampleTransformPlugin(iframe, audioBuffer, params);
      } else {
        throw new Error('Expected plugin to exist');
      }
    },
    /** @param {() => void} callback */
    onUpdate(callback) {
      iframeParent.addEventListener('sourceUpdate', (e) => {
        if (
          e.target instanceof HTMLIFrameElement &&
          e.target.id === pluginName
        ) {
          callback();
        }
      });
    },
    /** @param {() => void} callback */
    onUninstall(callback) {
      iframeParent.addEventListener('uninstall', (e) => {
        if (
          e.target instanceof HTMLIFrameElement &&
          e.target.id === pluginName
        ) {
          callback();
        }
      });
    },
    /** @param {string} newPluginSource */
    async replaceSource(newPluginSource) {
      let iframe = document.getElementById(pluginName);
      const installPromise = pluginInstallPromises[pluginName];
      if (iframe && iframe instanceof HTMLIFrameElement) {
        iframe.id = '';
        try {
          await installPlugin(pluginName, newPluginSource);
        } catch (err) {
          iframe.id = pluginName;
          pluginInstallPromises[pluginName] = installPromise;
          throw err;
        }
        iframeParent.removeChild(iframe);
        let newIframe = document.getElementById(pluginName);
        if (newIframe) {
          newIframe.dispatchEvent(new Event('sourceUpdate', { bubbles: true }));
        }
      } else {
        throw new Error('Expected plugin to exist');
      }
    },
    remove() {
      let iframe = document.getElementById(pluginName);
      if (iframe && iframe instanceof HTMLIFrameElement) {
        iframe.dispatchEvent(new Event('uninstall', { bubbles: true }));
        iframeParent.removeChild(iframe);
      } else {
        throw new Error('Expected plugin to exist');
      }
    },
  };
}

/** @param {string} pluginSource */
export async function getPluginContentId(pluginSource) {
  const data = new TextEncoder().encode(pluginSource);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

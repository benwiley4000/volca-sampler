import { v4 as uuidv4 } from 'uuid';

import { Mutex } from './mutex.js';

// These limits are significantly above anything we've already seen in terms of
// execution time, but we'll see how it goes in user land.
const PLUGIN_INSTALL_TIMEOUT = 250;
const PLUGIN_RUN_PER_SEC_TIMEOUT = 200;

const IFRAME_ORIGIN =
  typeof window === 'undefined'
    ? ''
    : window.location.protocol === 'http:'
    // use ip instead of localhost so the iframe gets its own thread
    ? 'http://127.0.0.1:3000'
    : `https://volca-sampler-plugin.benwiley.org`;

const iframeParent =
  typeof window === 'undefined'
    ? /** @type {HTMLDivElement} */ ({})
    : document.createElement('div');

if (typeof window !== 'undefined') {
  iframeParent.id = 'plugins';
  document.body.appendChild(iframeParent);
}

/** Used only for errors that will cause plugin to uninstall itself */
export class PluginError extends Error {}

/**
 * @typedef {{
 *   value: number;
 *   min: number;
 *   max: number;
 *   label: string;
 * }} PluginParamDef
 * @typedef {Record<string, PluginParamDef>} PluginParamsDef
 * @typedef {Record<string, number>} PluginParams
 */

/** @type {Record<string, Promise<PluginParamsDef>>} */
const pluginInstallPromises = {};

const pluginMutex = new Mutex();

/**
 * @param {string} pluginName
 * @param {string} pluginSource
 */
export async function installPlugin(pluginName, pluginSource) {
  /** @type {(params: PluginParamsDef) => void} */
  let onInstalled = () => {};
  let onInstallError = () => {};
  pluginInstallPromises[pluginName] = new Promise((resolve, reject) => {
    onInstalled = resolve;
    onInstallError = reject;
  });

  const unlock = await pluginMutex.lock();

  const iframe = document.createElement('iframe');
  iframe.id = pluginName;
  iframe.hidden = true;
  iframe.title = 'plugin-context';
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.src = `${IFRAME_ORIGIN}${window.location.pathname}plugin-context.html`;

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
          if (data.messageType === 'messageReceived') {
            timeout = setTimeout(() => {
              console.error(
                `Plugin took too long to install (${PLUGIN_INSTALL_TIMEOUT}+ milliseconds):`,
                pluginName
              );
              reject();
              window.removeEventListener('message', onMessage);
            }, PLUGIN_INSTALL_TIMEOUT);
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
  } finally {
    unlock();
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

  const unlock = await pluginMutex.lock();

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
          if (data.messageType === 'messageReceived') {
            const timeoutAmount =
              PLUGIN_RUN_PER_SEC_TIMEOUT * audioBuffer.duration;
            timeout = setTimeout(() => {
              console.error(
                `Plugin took too long to run: (${timeoutAmount}+ milliseconds):`,
                iframe.id
              );
              reject(new PluginError('Plugin took too long to return'));
              window.removeEventListener('message', onMessage);
            }, timeoutAmount);
            return;
          }
          if (data.messageType !== 'sampleTransform') return;
          if (data.error) {
            if (data.error === 'Invalid parameters') {
              console.error('Invalid plugin input:', iframe.id);
              reject(new Error('Invalid plugin input'));
            } else {
              console.error('Plugin call failed:', iframe.id);
              reject(new PluginError('Plugin failed to run'));
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
      iframe.dispatchEvent(new Event('plugin-error', { bubbles: true }));
      iframeParent.removeChild(iframe);
    }
    throw err;
  } finally {
    unlock();
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
    async sampleTransform(audioBuffer, params) {
      await pluginInstallPromises[pluginName];
      let iframe = document.getElementById(pluginName);
      if (iframe && iframe instanceof HTMLIFrameElement) {
        return sampleTransformPlugin(iframe, audioBuffer, params);
      } else {
        throw new Error('Expected plugin to exist');
      }
    },
    /** @param {() => void} callback */
    onPluginError(callback) {
      Promise.resolve(pluginInstallPromises[pluginName]).catch(callback);
      /** @param {Event} e */
      const handleUninstall = (e) => {
        if (
          e.target instanceof HTMLIFrameElement &&
          e.target.id === pluginName
        ) {
          callback();
        }
      };
      iframeParent.addEventListener('plugin-error', handleUninstall);
      return () => {
        iframeParent.removeEventListener('plugin-error', handleUninstall);
      };
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
        iframeParent.removeChild(iframe);
        delete pluginInstallPromises[pluginName];
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

/**
 * @param {string} pluginName
 */
export function isPluginInstalled(pluginName) {
  const iframe = document.getElementById(pluginName);
  return Boolean(iframe && iframe instanceof HTMLIFrameElement);
}

/**
 * @param {PluginParamsDef} pluginParamsDef
 * @returns {PluginParams}
 */
export function getDefaultParams(pluginParamsDef) {
  /** @type {PluginParams} */
  const params = {};
  for (const [key, paramDef] of Object.entries(pluginParamsDef)) {
    params[key] = paramDef.value;
  }
  return params;
}

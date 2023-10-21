import { v4 as uuidv4 } from 'uuid';

const PLUGIN_TIMEOUT = 10;

/**
 * @typedef {{ value: number; min: number; max: number }} PluginParamDef
 * @typedef {Record<string, PluginParamDef>} PluginParamsDef
 * @typedef {Record<string, number>} PluginParams
 */

/** @type {Record<string, Promise<PluginParamsDef>>} */
const pluginInstallPromises = {};

/**
 * @param {string} id
 * @param {string} pluginSource
 */
export async function installPlugin(id, pluginSource) {
  const iframe = document.createElement('iframe');
  iframe.id = id;
  iframe.hidden = true;
  iframe.title = 'plugin-context';
  iframe.src = 'plugin-context.html';
  iframe.setAttribute('sandbox', 'allow-scripts');

  /** @type {(params: PluginParamsDef) => void} */
  let onInstalled = () => {};
  pluginInstallPromises[id] = new Promise((resolve) => (onInstalled = resolve));

  document.body.appendChild(iframe);

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
              console.error('Plugin took too long to install:', id);
              reject();
              window.removeEventListener('message', onMessage);
            }, PLUGIN_TIMEOUT);
            return;
          }
          if (data.messageType !== 'pluginInstall') return;
          if (data.error) {
            console.error('Plugin failed to install:', id);
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
    document.body.removeChild(iframe);
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
      document.body.removeChild(iframe);
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
 * @param {string} id
 */
export async function getPlugin(id) {
  const params = await pluginInstallPromises[id];
  const iframe = document.getElementById(id);
  if (iframe && iframe instanceof HTMLIFrameElement) {
    return {
      params,
      /**
       * @param {AudioBuffer} audioBuffer
       * @param {PluginParams} params
       */
      sampleTransform(audioBuffer, params) {
        return sampleTransformPlugin(iframe, audioBuffer, params);
      },
    };
  }
  throw new Error('Expected plugin to exist');
}

import { v4 as uuidv4 } from 'uuid';

const PLUGIN_TIMEOUT = 10;

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

  try {
    await /** @type {Promise<void>} */ (
      new Promise((resolve, reject) => {
        /** @type {ReturnType<typeof setTimeout>} */
        let timeout;

        /** @param {MessageEvent} event */
        const onMessage = ({ source, data }) => {
          if (source !== iframe.contentWindow) return;
          if (data.messageId !== messageId) return;
          if (data.messageType !== 'pluginInstall') return;
          if (data.error) {
            console.error('Plugin failed to install:', id);
            reject();
          } else {
            resolve();
          }
          clearTimeout(timeout);
          window.removeEventListener('message', onMessage);
        };

        window.addEventListener('message', onMessage);
        timeout = setTimeout(() => {
          console.error('Plugin took too long to install:', id);
          reject();
          window.removeEventListener('message', onMessage);
        }, PLUGIN_TIMEOUT);
      })
    );
  } catch (err) {
    document.body.removeChild(iframe);
    throw err;
  }
}

/**
 * Perform a transform on a mono audio buffer using an iframe plugin
 * @param {HTMLIFrameElement} iframe
 * @param {AudioBuffer} audioBuffer
 * @returns {Promise<AudioBuffer>} A transformed audio buffer
 */
async function sampleTransformPlugin(iframe, audioBuffer) {
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
    },
    '*'
  );

  const newAudioData = await /** @type {Promise<Float32Array>} */ (
    new Promise((resolve, reject) => {
      /** @type {ReturnType<typeof setTimeout>} */
      let timeout;

      /** @param {MessageEvent} event */
      const onMessage = ({ source, data }) => {
        if (source !== iframe.contentWindow) return;
        if (data.messageId !== messageId) return;
        if (data.messageType !== 'sampleTransform') return;
        if (data.error) {
          console.error('Plugin call failed:', iframe.id);
          reject();
        } else {
          resolve(data.newAudioData);
        }
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
      };

      window.addEventListener('message', onMessage);
      timeout = setTimeout(() => {
        console.error('Plugin took too long to run:', iframe.id);
        reject();
        window.removeEventListener('message', onMessage);
      }, PLUGIN_TIMEOUT);
    })
  );

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
export function getPlugin(id) {
  const iframe = document.getElementById(id);
  if (iframe && iframe instanceof HTMLIFrameElement) {
    return {
      /** @param {AudioBuffer} audioBuffer */
      sampleTransform(audioBuffer) {
        return sampleTransformPlugin(iframe, audioBuffer);
      },
    };
  }
  throw new Error('Expected plugin to exist');
}

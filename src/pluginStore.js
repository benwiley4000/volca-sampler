import localforage from 'localforage';

import {
  getPlugin,
  getPluginContentId,
  installPlugin,
  isPluginInstalled,
} from './utils/plugins';
import { onTabUpdateEvent, sendTabUpdateEvent } from './utils/tabSync';
import { SampleContainer } from './store';

/** @typedef {import('./utils/plugins').PluginParamsDef} PluginParamsDef */

/**
 * @typedef {object} PluginStorageFormat
 * @property {string} pluginSource
 * @property {PluginParamsDef} params
 */

const pluginStore = localforage.createInstance({
  name: 'plugin_store',
  driver: localforage.INDEXEDDB,
});

/**
 * @param {string} pluginName
 * @returns {Promise<PluginStorageFormat | null>}
 */
function pluginStoreGet(pluginName) {
  return pluginStore.getItem(pluginName);
}

/**
 * @param {string} pluginName
 * @param {PluginStorageFormat} data
 */
function pluginStoreSet(pluginName, data) {
  return pluginStore.setItem(pluginName, data);
}

/**
 * @param {(data: PluginStorageFormat, pluginName: string) => void} callback
 * @returns {ReturnType<typeof pluginStore.iterate>}
 */
function pluginStoreIterate(callback) {
  return pluginStore.iterate(callback);
}

export async function listPluginParams() {
  /** @type {Map<string, PluginParamsDef>} */
  const allParams = new Map();
  await pluginStoreIterate(({ params }, pluginName) => {
    allParams.set(pluginName, params);
  });
  // Sort alphabetically by pluginName
  return new Map(
    [...allParams].sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 1))
  );
}

/**
 * Always use this when a user is uploading a new plugin.
 * @param {object} params
 * @param {File} params.file
 * @param {(name: string) => Promise<string>} params.onConfirmName
 * @param {(name: string) => Promise<
 *   'replace' | 'use-existing' | 'change-name'
 * >} params.onConfirmReplace
 * @returns {Promise<'added' | 'replaced' | 'used-existing' | 'exists'>}
 */
export async function addPluginFromFile({
  file,
  onConfirmName,
  onConfirmReplace,
}) {
  if (file.size > 5_000_000) {
    throw new Error('Plugin is too big.');
  }
  let pluginName = file.name.toLowerCase();
  if (!pluginName.endsWith('.js')) {
    throw new Error('Expecting JavaScript file.');
  }
  const pluginSource = await file.text();
  return await addPlugin({
    pluginName,
    pluginSource,
    onConfirmName,
    onConfirmReplace,
  });
}

/**
 * This can be called directly when importing plugins from an export file.
 * @param {object} params
 * @param {string} params.pluginName
 * @param {string} params.pluginSource
 * @param {(name: string) => Promise<string>} params.onConfirmName
 * @param {(name: string) => Promise<
 *   'replace' | 'use-existing' | 'change-name'
 * >} params.onConfirmReplace
 * @returns {Promise<'added' | 'replaced' | 'used-existing' | 'exists'>}
 */
export async function addPlugin({
  pluginName,
  pluginSource,
  onConfirmName,
  onConfirmReplace,
}) {
  const contentId = await getPluginContentId(pluginSource);

  const existingNames = await pluginStore.keys();

  let finalPluginName = pluginName;
  let shouldReplace = false;

  do {
    if (existingNames.includes(finalPluginName)) {
      const { pluginSource: existingContent } =
        (await pluginStoreGet(finalPluginName)) || {};
      if (!existingContent) {
        throw new Error('Expected plugin to be installed');
      }
      const existingContentId = await getPluginContentId(existingContent);
      if (existingContentId === contentId) {
        return 'exists';
      }
      const replaceResponse = await onConfirmReplace(finalPluginName);
      if (replaceResponse === 'use-existing') {
        return 'used-existing';
      }
      shouldReplace = replaceResponse === 'replace';
      if (shouldReplace) {
        break;
      }
      const pluginNameWithoutExtension = finalPluginName.replace(/\.js$/, '');
      let increment = 2;
      do {
        finalPluginName = `${pluginNameWithoutExtension} ${increment++}.js`;
      } while (existingNames.includes(finalPluginName));
    }
    // only ask for name confirmation if the original filename was taken
    if (finalPluginName !== pluginName) {
      finalPluginName = await onConfirmName(finalPluginName);
    }
  } while (existingNames.includes(finalPluginName));

  if (shouldReplace && isPluginInstalled(finalPluginName)) {
    const plugin = getPlugin(finalPluginName);
    await plugin.replaceSource(pluginSource);
  } else {
    await installPlugin(finalPluginName, pluginSource);
  }

  const params = await getPlugin(finalPluginName).getParams();

  await pluginStoreSet(finalPluginName, {
    pluginSource,
    params,
  });

  sendTabUpdateEvent(
    'plugin',
    [finalPluginName],
    shouldReplace ? 'edit' : 'create'
  );

  return shouldReplace ? 'replaced' : 'added';
}

/**
 * @param {string} pluginName
 * @param {boolean} [noPersist]
 */
export async function removePlugin(pluginName, noPersist = false) {
  const plugin = getPlugin(pluginName);
  plugin.remove();
  if (!noPersist) {
    await pluginStore.removeItem(pluginName);
    sendTabUpdateEvent('plugin', [pluginName], 'delete');
  }
}

/** @param {string} pluginName */
export async function getPluginSource(pluginName) {
  const { pluginSource = null } = (await pluginStoreGet(pluginName)) || {};
  return pluginSource;
}

/**
 * @param {object} params
 * @param {string} params.oldPluginName
 * @param {string} params.newPluginName
 * @param {(name: string) => Promise<string>} params.onConfirmName
 * @param {(name: string) => Promise<
 *   'replace' | 'use-existing' | 'change-name'
 * >} params.onConfirmReplace
 * @param {Map<string, SampleContainer>} params.userSamples
 * @returns {Promise<{
 *   updatedSamples: SampleContainer[];
 *   result: Awaited<ReturnType<typeof addPlugin>>;
 * }>}
 */
export async function renamePlugin({
  oldPluginName,
  newPluginName,
  onConfirmName,
  onConfirmReplace,
  userSamples,
}) {
  const pluginSource = await getPluginSource(oldPluginName);
  if (!pluginSource) {
    throw new Error('Expected plugin to be installed');
  }
  const result = await addPlugin({
    pluginName: newPluginName,
    pluginSource,
    onConfirmName,
    onConfirmReplace,
  });
  if (result === 'used-existing' || result === 'exists') {
    // TODO: alert user for "exists" case... but edge case
    return {
      updatedSamples: [],
      result,
    };
  }
  const affectedSamples = [...userSamples.values()].filter((sample) =>
    sample.metadata.plugins.some((p) => p.pluginName === oldPluginName)
  );
  if (!affectedSamples.length) {
    await removePlugin(oldPluginName);
    return {
      updatedSamples: [],
      result,
    };
  }
  const newAffectedSamples = affectedSamples.map(
    (sample) =>
      // create new to avoid changing date modified and to defer persist
      new SampleContainer.Mutable({
        id: sample.id,
        ...sample.metadata,
        plugins: sample.metadata.plugins.map((p) => ({
          ...p,
          pluginName:
            p.pluginName === oldPluginName ? newPluginName : p.pluginName,
        })),
      })
  );
  await Promise.all(newAffectedSamples.map((s) => s.persist()));
  await removePlugin(oldPluginName);
  return {
    updatedSamples: newAffectedSamples,
    result,
  };
}

/** @type {Promise<void> | null} */
let pluginInitPromise = null;
export async function initPlugins() {
  pluginInitPromise =
    pluginInitPromise ||
    (async () => {
      onTabUpdateEvent('plugin', async ({ action, ids }) => {
        for (const pluginName of ids) {
          if (action === 'create') {
            await addPluginFromStorage(pluginName);
          }
          if (action === 'edit') {
            await updatePluginFromStorage(pluginName);
          }
          if (action === 'delete') {
            await removePlugin(pluginName, true);
          }
        }
      });
      /** @type {Promise<void>[]} */
      const installPromises = [];
      await pluginStoreIterate(({ pluginSource }, pluginName) => {
        installPromises.push(installPlugin(pluginName, pluginSource));
      });
      await Promise.all(installPromises);
    })();
  await pluginInitPromise;
}

/** @param {string} pluginName */
export async function reinitPlugin(pluginName) {
  const { pluginSource = null } = (await pluginStoreGet(pluginName)) || {};
  if (!pluginSource) {
    throw new Error('Expected plugin to be stored');
  }
  await installPlugin(pluginName, pluginSource);
}

/** @param {string} pluginName */
async function addPluginFromStorage(pluginName) {
  const { pluginSource = null } = (await pluginStoreGet(pluginName)) || {};
  if (!pluginSource) {
    throw new Error('Expected plugin to be stored');
  }
  await installPlugin(pluginName, pluginSource);
}

/** @param {string} pluginName */
async function updatePluginFromStorage(pluginName) {
  if (!isPluginInstalled(pluginName)) {
    await addPluginFromStorage(pluginName);
    return;
  }
  const { pluginSource = null } = (await pluginStoreGet(pluginName)) || {};
  if (!pluginSource) {
    throw new Error('Expected plugin to be stored');
  }
  const plugin = getPlugin(pluginName);
  await plugin.replaceSource(pluginSource);
}

/** @typedef {'installed' | 'broken' | 'missing'} PluginStatus */

/**
 * @param {...string} pluginNames
 * @returns {Promise<PluginStatus[]>}
 */
export async function getPluginStatus(...pluginNames) {
  await pluginInitPromise;
  const existingNames = await pluginStore.keys();
  return pluginNames.map((pluginName) => {
    const isInstalled = isPluginInstalled(pluginName);
    if (isInstalled) return 'installed';
    if (existingNames.includes(pluginName)) return 'broken';
    return 'missing';
  });
}

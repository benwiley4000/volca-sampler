import localforage from 'localforage';

import {
  getPlugin,
  getPluginContentId,
  installPlugin,
  isPluginInstalled,
} from './utils/plugins';
import { onTabUpdateEvent, sendTabUpdateEvent } from './utils/tabSync';
import { SampleContainer } from './store';

const pluginStore = localforage.createInstance({
  name: 'plugin_store',
  driver: localforage.INDEXEDDB,
});

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
      const existingContent = /** @type {string} */ (
        await pluginStore.getItem(finalPluginName)
      );
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

  if (shouldReplace) {
    const plugin = getPlugin(finalPluginName);
    await plugin.replaceSource(pluginSource);
  } else {
    await installPlugin(finalPluginName, pluginSource);
  }

  await pluginStore.setItem(finalPluginName, pluginSource);
  sendTabUpdateEvent(
    'plugin',
    [finalPluginName],
    shouldReplace ? 'edit' : 'create'
  );

  return shouldReplace ? 'replaced' : 'added';
}

// TODO: code that calls this needs to handle samples using this plugin first
/** @param {string} pluginName */
export async function removePlugin(pluginName) {
  const plugin = getPlugin(pluginName);
  plugin.remove();
  await pluginStore.removeItem(pluginName);
  sendTabUpdateEvent('plugin', [pluginName], 'delete');
}

/** @param {string} pluginName */
export async function getPluginSource(pluginName) {
  /** @type {string | null} */
  const pluginSource = await pluginStore.getItem(pluginName);
  return pluginSource;
}

// TODO: code that calls this needs to update userSamples in App.js and
// send a tab event for updated samples
/**
 * @param {object} params
 * @param {string} params.oldPluginName
 * @param {string} params.newPluginName
 * @param {(name: string) => Promise<string>} params.onConfirmName
 * @param {(name: string) => Promise<
 *   'replace' | 'use-existing' | 'change-name'
 * >} params.onConfirmReplace
 * @param {Map<string, SampleContainer>} params.userSamples
 * @returns {Promise<SampleContainer[]>}
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
  await addPlugin({
    pluginName: newPluginName,
    pluginSource,
    onConfirmName,
    onConfirmReplace,
  });
  const affectedSamples = [...userSamples.values()].filter((sample) =>
    sample.metadata.plugins.some((p) => p.pluginName === oldPluginName)
  );
  if (!affectedSamples.length) {
    await removePlugin(oldPluginName);
    return [];
  }
  const newAffectedSamples = affectedSamples.map(
    (sample) =>
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
  return newAffectedSamples;
}

export async function initPlugins() {
  await pluginStore.iterate(async (pluginSource, pluginName) => {
    await installPlugin(pluginName, pluginSource);
  });
  onTabUpdateEvent('plugin', async ({ action, ids }) => {
    for (const pluginName of ids) {
      if (action === 'create') {
        await addPluginFromStorage(pluginName);
      }
      if (action === 'edit') {
        await updatePluginFromStorage(pluginName);
      }
      if (action === 'delete') {
        await removePlugin(pluginName);
      }
    }
  });
}

/** @param {string} pluginName */
async function addPluginFromStorage(pluginName) {
  const pluginSource = await pluginStore.getItem(pluginName);
  await installPlugin(pluginName, pluginSource);
}

/** @param {string} pluginName */
async function updatePluginFromStorage(pluginName) {
  const pluginSource = await pluginStore.getItem(pluginName);
  const plugin = getPlugin(pluginName);
  await plugin.replaceSource(pluginSource);
}

/** @param {string} pluginName */
export async function getPluginStatus(pluginName) {
  const isInstalled = isPluginInstalled(pluginName);
  if (isInstalled) return 'installed';
  const existingNames = await pluginStore.keys();
  if (existingNames.includes(pluginName)) return 'broken';
  return 'missing';
}

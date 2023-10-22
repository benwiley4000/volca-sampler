import localforage from 'localforage';

import { getPlugin, getPluginContentId, installPlugin } from './utils/plugins';

const pluginStore = localforage.createInstance({
  name: 'plugin_store',
  driver: localforage.INDEXEDDB,
});

/**
 * @param {File} file
 * @param {(name: string) => Promise<string>} onConfirmName
 * @param {(name: string) => Promise<boolean>} onConfirmReplace
 */
export async function addPlugin(file, onConfirmName, onConfirmReplace) {
  if (file.size > 5_000_000) {
    throw new Error('Plugin is too big.');
  }
  let pluginName = file.name.toLowerCase();
  if (!pluginName.endsWith('.js')) {
    throw new Error('Expecting JavaScript file.');
  }
  const pluginSource = await file.text();
  const contentId = await getPluginContentId(pluginSource);

  const existingNames = await pluginStore.keys();

  let shouldReplace = false;

  do {
    if (existingNames.includes(pluginName)) {
      const existingContent = /** @type {string} */ (
        await pluginStore.getItem(pluginName)
      );
      const existingContentId = await getPluginContentId(existingContent);
      if (existingContentId === contentId) {
        throw new Error('Plugin already added.');
      }
      shouldReplace = await onConfirmReplace(pluginName);
      if (shouldReplace) {
        break;
      }
      const pluginNameWithoutExtension = pluginName.replace(/\.js$/, '');
      let increment = 2;
      do {
        pluginName = `${pluginNameWithoutExtension} ${increment++}.js`;
      } while (!existingNames.includes(pluginName));
    }
    pluginName = await onConfirmName(pluginName);
  } while (existingNames.includes(pluginName));

  if (shouldReplace) {
    const plugin = getPlugin(pluginName);
    await plugin.replaceSource(pluginSource);
  } else {
    await installPlugin(pluginName, pluginSource);
  }

  await pluginStore.setItem(pluginName, pluginSource);
}

// TODO: code that calls this needs to handle samples using this plugin

/** @param {string} pluginName */
export async function removePlugin(pluginName) {
  const plugin = getPlugin(pluginName);
  plugin.remove();
  await pluginStore.removeItem(pluginName);
}

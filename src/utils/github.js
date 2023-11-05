/**
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string} folder
 */
async function listRepoFolder(owner, repo, branch, folder) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${folder}?ref=${branch}`
  );
  /** @type {{ name: string }[]} */
  const files = await res.json();
  return files.map((file) => file.name);
}

/**
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string} folder
 * @param {string} filename
 */
async function getFileContent(owner, repo, branch, folder, filename) {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${folder}/${filename}`
  );
  const content = await res.text();
  return content;
}

const owner = 'benwiley4000';
const repo = 'volca-sampler-plugins';
const branch = 'master';
const folder = 'plugins';

export async function getExamplePlugins() {
  const filenames = await listRepoFolder(owner, repo, branch, folder);
  const contents = await Promise.all(
    filenames.map((filename) =>
      getFileContent(owner, repo, branch, folder, filename)
    )
  );
  return filenames.map((filename, i) => ({
    pluginName: filename,
    pluginSource: contents[i],
  }));
}

/** @param {string} pluginName */
export function getPluginSourceLink(pluginName) {
  return `https://github.com/benwiley4000/volca-sampler-plugins/blob/master/plugins/${pluginName}`;
}

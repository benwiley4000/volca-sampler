const test = require('tape');
const express = require('express');
const path = require('path');
const { transform: transformCjsToEsm } = require('cjstoesm');
const puppeteer = require('puppeteer');
const child_process = require('child_process');
const fs = require('fs').promises;
const mkdirp = require('mkdirp');

console.log('Building necessary files...');
child_process.execSync(
  path.join(__dirname, '..', 'build-factory-samples-index'),
  { cwd: path.join(__dirname, '..') }
);
child_process.execSync(path.join(__dirname, '..', 'build-bindings.sh'), {
  cwd: path.join(__dirname, '..'),
});
child_process.execSync(path.join(__dirname, 'build-test-executable.sh'), {
  cwd: __dirname,
});
console.log('Files built.\n');

const testPort = 5432;
const moduleCache = {};
const moduleMocks = {
  localforage: 'export default { createInstance: () => ({}) };',
  react: `
export const createContext = () => {};
export const createElement = () => {};
export const useCallback = () => {};
export const useContext = () => {};
export const useMemo = () => {};
export const useState = () => {};
  `,
  uuid: 'export const v4 = () => `id-${Math.random()}`;',
  'base64-arraybuffer': `
export const encode = () => {};
export const decode = () => {};
  `,
};
function getTestServer() {
  const testServer = express();
  testServer.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>`);
  });
  testServer.use(express.static(path.join(__dirname, '..', 'public')));
  testServer.get('/node_modules/:namespace/:dependency?', (req, res) => {
    const dependencyName = req.params.dependency
      ? `${req.params.namespace}/${req.params.dependency}`
      : req.params.namespace;
    (async function getModuleContent() {
      // mock some modules that won't run well in the browser and don't need to
      // do much for our tests
      if (Object.keys(moduleMocks).includes(dependencyName)) {
        console.log(`Fetching node module [MOCKED]......... ${dependencyName}`);
        return moduleMocks[dependencyName];
      }
      // for all others we can transform their imports/exports and run them
      let resolvedPath = require.resolve(dependencyName);
      // some built-in node modules won't resolve correctly because we actually
      // need to use the polyfill in the browser (.e.g 'buffer')
      if (resolvedPath === dependencyName) {
        const modulePath = path.join(
          __dirname,
          '..',
          'node_modules',
          dependencyName
        );
        resolvedPath = path.join(
          modulePath,
          require(path.join(modulePath, 'package.json')).main || 'index.js'
        );
      }
      if (moduleCache[resolvedPath]) {
        console.log(`Fetching node module [CACHED]......... ${dependencyName}`);
        return moduleCache[resolvedPath];
      }
      console.log(`Fetching node module [TRANSFORMING]... ${dependencyName}`);
      const {
        files: [{ text }],
      } = await transformCjsToEsm({
        input: resolvedPath,
        outDir: 'does_not_matter',
        write: false,
      });
      moduleCache[resolvedPath] = text;
      return text;
    })()
      .then((content) => {
        res.contentType('application/javascript').end(content);
      })
      .catch(() => {
        res.status(500).end('Failed to load module');
      });
  });
  testServer.use(express.static(path.join(__dirname, '..')));
  return testServer.listen(testPort);
}

const importMap = {
  imports: Object.keys(require('../package-lock.json').dependencies).reduce(
    (imports, dependencyName) => {
      imports[dependencyName] = `/node_modules/${dependencyName}`;
      return imports;
    },
    {}
  ),
};

/**
 * @param {{ scripts?: string[]; modules?: { url: string; globalName: string }[] }} opts
 * @param {(page: puppeteer.Page) => void | Promise<void>} callback
 */
async function forEachBrowser({ scripts, modules }, callback) {
  const testServer = getTestServer();
  // TODO: support firefox when named import maps can work
  for (const product of ['chrome' /*, 'firefox'*/]) {
    // TODO: find another way to do this (needed for Drone at the moment
    // because we run the Docker container as root)
    const browser = await puppeteer.launch({ product, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${testPort}`);
    // allow importing node modules by name (non-relative) in the browser
    page.addScriptTag({
      type: 'importmap',
      content: JSON.stringify(importMap),
    });
    // include node module polyfills in browser
    await page.evaluate(async () => {
      window.global = window;
      const bufferModule = await import('buffer');
      // let module finish executing
      await Promise.resolve();
      window.Buffer = bufferModule.Buffer;
    });
    for (const script of scripts || []) {
      await page.addScriptTag({ url: script });
    }
    for (const module of modules || []) {
      await page.evaluate(async ({ url, globalName }) => {
        window[globalName] = await import(url);
      }, module);
    }
    try {
      await callback(page);
    } catch (err) {
      console.error(err);
      console.error(`Above error occurred for "${product}" browser`);
      throw err;
    }
    await browser.close();
  }
  testServer.close();
}

/**
 * @param {test.Test} t
 * @param {Buffer} receivedBuffer
 * @param {Buffer} expectedBuffer
 */
function printDiffForWavBuffers(t, receivedBuffer, expectedBuffer) {
  const receivedPcmData = receivedBuffer.slice(44);
  const expectedPcmData = expectedBuffer.slice(44);
  {
    const badRanges = [];
    // samples are 16-bit stereo-interleaved so 32 bits for one frame
    const receivedSamples = new Int32Array(receivedPcmData.buffer);
    const expectedSamples = new Int32Array(expectedPcmData.buffer);
    for (let i = 0; i < receivedSamples.length; i++) {
      if (expectedSamples[i] !== receivedSamples[i]) {
        const currentRange = badRanges[badRanges.length - 1];
        if (currentRange && currentRange[1] + 1 === i) {
          currentRange[1] = i;
        } else {
          badRanges.push([i, i]);
        }
      }
    }
    t.comment(
      `Bad sample indices (of ${receivedSamples.length}):\n${badRanges
        .map(([a, b]) => `${a}-${b}`)
        .join(', ')}`
    );
  }
  {
    const badRanges = [];
    for (let i = 0; i < receivedPcmData.length; i++) {
      if (expectedPcmData[i] !== receivedPcmData[i]) {
        const currentRange = badRanges[badRanges.length - 1];
        // allow a 4 byte gap to be considered part of the same range
        if (currentRange && currentRange[1] + 4 >= i) {
          currentRange[1] = i;
        } else {
          badRanges.push([i, i]);
        }
      }
    }
    t.comment(
      `Bad byte ranges (of ${receivedBuffer.length}):\n${badRanges
        // show byte location within file so increment for header size
        .map(([a, b]) => `${a + 44}-${b + 44}`)
        .join(', ')}`
    );
  }
}

const sourceFileId = '/factory-samples/02 Kick 3.wav';
const slotNumber = 2;

/**
 * @type {Record<'compressed' | 'uncompressed', Buffer>}
 */
const snapshots = ['compressed', 'uncompressed']
  .map((suffix) => {
    const snapshot = require('fs').readFileSync(
      path.join(__dirname, 'snapshots', `syro_stream_${suffix}.wav`)
    );
    return [suffix, snapshot];
  })
  .reduce(
    (snapshots, [key, snapshot]) => ({ ...snapshots, [key]: snapshot }),
    {}
  );

const artifactsDir = path.join(__dirname, 'artifacts');
mkdirp.sync(artifactsDir);

test('syroBindings load correctly', async (t) => {
  await forEachBrowser(
    {
      scripts: ['syro-bindings.js'],
      modules: [
        {
          url: '/src/utils/getSyroBindings.js',
          globalName: 'getSyroBindingsModule',
        },
      ],
    },
    async (page) => {
      const b = await page.evaluateHandle(() =>
        getSyroBindingsModule.getSyroBindings()
      );
      t.equal(
        await page.evaluate((bindings) => typeof bindings, b),
        'object',
        'Syro bindings should load'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.prepareSampleBufferFromWavData,
          b
        ),
        'function',
        'prepareSampleBufferFromWavData is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.prepareSampleBufferFrom16BitPcmData,
          b
        ),
        'function',
        'prepareSampleBufferFrom16BitPcmData is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.getSampleBufferChunkPointer,
          b
        ),
        'function',
        'getSampleBufferChunkPointer is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.getSampleBufferChunkSize,
          b
        ),
        'function',
        'getSampleBufferChunkSize is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.getSampleBufferProgress,
          b
        ),
        'function',
        'getSampleBufferProgress is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.getSampleBufferTotalSize,
          b
        ),
        'function',
        'getSampleBufferTotalSize is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.cancelSampleBufferWork,
          b
        ),
        'function',
        'cancelSampleBufferWork is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.registerUpdateCallback,
          b
        ),
        'function',
        'registerUpdateCallback is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.unregisterUpdateCallback,
          b
        ),
        'function',
        'unregisterUpdateCallback is defined'
      );
      t.equal(
        await page.evaluate((bindings) => typeof bindings.heap8Buffer, b),
        'function',
        'heap8Buffer is defined'
      );
    }
  );
});

test('syro-utils.c', async (t) => {
  /**
   * @type {Record<'compressed' | 'uncompressed', string>}
   */
  const nativeSampleBufferFilenames = JSON.parse(
    child_process
      .execSync(
        `../convert-sample "../../public${sourceFileId}" ${slotNumber}`,
        {
          cwd: artifactsDir,
        }
      )
      .toString()
  );
  for (const key of /** @type {('compressed' | 'uncompressed')[]} */ ([
    'compressed',
    'uncompressed',
  ])) {
    const nativeSampleBufferContents = await fs.readFile(
      path.join(artifactsDir, nativeSampleBufferFilenames[key])
    );
    const nativeSampleBufferHeader = nativeSampleBufferContents.slice(0, 44);
    const snapshotSampleBufferHeader = snapshots[key].slice(0, 44);
    t.deepEqual(
      nativeSampleBufferHeader,
      snapshotSampleBufferHeader,
      `Native WAV headers should match snapshot (${key})`
    );
    const nativeSampleBufferPcmData = nativeSampleBufferContents.slice(44);
    const snapshotSampleBufferPcmData = snapshots[key].slice(44);
    t.deepEqual(
      nativeSampleBufferPcmData,
      snapshotSampleBufferPcmData,
      `Native PCM data should match snapshot (${key})`
    );
    if (!nativeSampleBufferPcmData.equals(snapshotSampleBufferPcmData)) {
      printDiffForWavBuffers(t, nativeSampleBufferContents, snapshots[key]);
    }
  }
});

test('getSampleBuffer', async (t) => {
  await forEachBrowser(
    {
      scripts: ['syro-bindings.js'],
      modules: [
        {
          url: '/src/store.js',
          globalName: 'storeModule',
        },
        {
          url: '/src/utils/syro.js',
          globalName: 'syroUtilsModule',
        },
      ],
    },
    async (page) => {
      await page.evaluate(() => {
        window.SampleContainer = storeModule.SampleContainer;
        window.getSampleBuffer = syroUtilsModule.getSampleBuffer;
      });
      for (const key of /** @type {('compressed' | 'uncompressed')[]} */ ([
        'compressed',
        'uncompressed',
      ])) {
        /**
         * @type {puppeteer.JSHandle<import('../src/store').SampleContainer>}
         */
        const sampleContainerHandle = await page.evaluateHandle(
          async (sourceFileId, slotNumber, useCompression) => {
            /**
             * @type {typeof import('../src/store').SampleContainer}
             */
            const SampleContainer = window.SampleContainer;
            return new SampleContainer.Mutable({
              name: 'textSample',
              sourceFileId,
              slotNumber,
              useCompression,
              trim: {
                frames: [0, 0],
                // for render only; irrelevant for test but required
                waveformPeaks: {
                  positive: new Float32Array(),
                  negative: new Float32Array(),
                },
              },
            });
          },
          sourceFileId,
          slotNumber,
          key === 'compressed'
        );
        const webSampleBufferContents = Buffer.from(
          await page.evaluate(async (sampleContainer) => {
            /**
             * @type {typeof import('../src/utils/syro').getSampleBuffer}
             */
            const getSampleBuffer = window.getSampleBuffer;
            const sampleBuffer = await getSampleBuffer(
              sampleContainer,
              () => null
            ).sampleBufferPromise;
            const sampleBufferContents = [...sampleBuffer];
            return sampleBufferContents;
          }, sampleContainerHandle)
        );
        await fs.writeFile(
          path.join(
            artifactsDir,
            `${
              sourceFileId.split('/').pop().split('.wav')[0]
            } [wasm] (${key}).syrostream.wav`
          ),
          webSampleBufferContents
        );
        const webSampleBufferHeader = webSampleBufferContents.slice(0, 44);
        const snapshotSampleBufferHeader = snapshots[key].slice(0, 44);
        t.deepEqual(
          webSampleBufferHeader,
          snapshotSampleBufferHeader,
          `WASM WAV headers should match snapshot (${key})`
        );
        const webSampleBufferPcmData = webSampleBufferContents.slice(44);
        const snapshotSampleBufferPcmData = snapshots[key].slice(44);
        t.deepEqual(
          webSampleBufferPcmData,
          snapshotSampleBufferPcmData,
          `WASM PCM data should match snapshot (${key})`
        );
        if (!webSampleBufferPcmData.equals(snapshotSampleBufferPcmData)) {
          printDiffForWavBuffers(t, webSampleBufferContents, snapshots[key]);
        }
      }
    }
  );
});

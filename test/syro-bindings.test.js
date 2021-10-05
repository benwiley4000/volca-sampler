const test = require('tape');
const express = require('express');
const path = require('path');
const { transform: transformCjsToEsm } = require('cjstoesm');
const puppeteer = require('puppeteer');
const child_process = require('child_process');
const fs = require('fs').promises;

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
    console.log(`Fetching node module: ${dependencyName}`);
    (async function getModuleContent() {
      switch (dependencyName) {
        // mock some modules that won't run well in the browser and don't need
        // to do much for our tests
        case 'localforage':
          return 'export default { createInstance: () => ({}) };';
        case 'uuid':
          return 'export const v4 = () => `id-${Math.random()}`;';
        // for all others we can transform their imports/exports and run them
        default: {
          let resolvedPath = require.resolve(dependencyName);
          // some built-in node modules won't resolve correctly because we
          // actually need to use the polyfill in the browser (.e.g 'buffer')
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
          const {
            files: [{ text }],
          } = await transformCjsToEsm({
            input: resolvedPath,
            outDir: 'does_not_matter',
            write: false,
          });
          return text;
        }
      }
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
    const browser = await puppeteer.launch({ product });
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
          (bindings) => typeof bindings.startSampleBufferFrom16BitPcmData,
          b
        ),
        'function',
        'startSampleBufferFrom16BitPcmData is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.iterateSampleBuffer,
          b
        ),
        'function',
        'iterateSampleBuffer is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.getSampleBufferPointer,
          b
        ),
        'function',
        'getSampleBufferPointer is defined'
      );
      t.equal(
        await page.evaluate(
          (bindings) => typeof bindings.getSampleBufferSize,
          b
        ),
        'function',
        'getSampleBufferSize is defined'
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
        await page.evaluate((bindings) => typeof bindings.freeSampleBuffer, b),
        'function',
        'freeSampleBuffer is defined'
      );
      t.equal(
        await page.evaluate((bindings) => typeof bindings.heap8Buffer, b),
        'function',
        'heap8Buffer is defined'
      );
    }
  );
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
      const sourceFileId = '/factory-samples/02 Kick 3.wav';
      const slotNumber = 2;
      /**
       * @type {puppeteer.JSHandle<import('../src/store').SampleContainer>}
       */
      const sampleContainerUncompressedHandle = await page.evaluateHandle(
        async (sourceFileId, slotNumber) => {
          /**
           * @type {typeof import('../src/store').SampleContainer}
           */
          const SampleContainer = window.SampleContainer;
          return new SampleContainer.Mutable({
            name: 'textSample',
            sourceFileId,
            slotNumber,
            useCompression: false,
          });
        },
        sourceFileId,
        slotNumber
      );
      /**
       * @type {puppeteer.JSHandle<import('../src/store').SampleContainer>}
       */
      const sampleContainerCompressedHandle = await page.evaluateHandle(
        /**
         * @param {SampleContainer} sampleContainerUncompressed
         */
        async (sampleContainerUncompressed) =>
          sampleContainerUncompressed instanceof SampleContainer.Mutable &&
          sampleContainerUncompressed.update({
            useCompression: true,
          }),
        sampleContainerUncompressedHandle
      );
      const nativeSampleBufferContents = await fs.readFile(
        path.join(
          __dirname,
          JSON.parse(
            child_process
              .execSync(
                `./convert-sample "../public${sourceFileId}" ${slotNumber}`,
                { cwd: __dirname }
              )
              .toString()
          ).uncompressed
        )
      );
      for (const sampleContainerHandle of [
        sampleContainerUncompressedHandle,
        // TODO: enable compressed test if it can work better with wasm
        // sampleContainerCompressedHandle,
      ]) {
        const label =
          sampleContainerHandle === sampleContainerCompressedHandle
            ? '(compressed)'
            : '(uncompressed)';
        const webSampleBufferContents = Buffer.from(
          await page.evaluate(async (sampleContainer) => {
            /**
             * @type {typeof import('../src/utils/syro').getSampleBuffer}
             */
            const getSampleBuffer = window.getSampleBuffer;
            const sampleBuffer = await getSampleBuffer(
              sampleContainer,
              () => null
            );
            const sampleBufferContents = [...sampleBuffer];
            return sampleBufferContents;
          }, sampleContainerHandle)
        );
        await fs.writeFile(
          path.join(
            __dirname,
            `${
              sourceFileId.split('/').pop().split('.wav')[0]
            } [wasm] ${label}.wav`
          ),
          webSampleBufferContents
        );
        const webSampleBufferHeader = webSampleBufferContents.slice(0, 44);
        const nativeSampleBufferHeader = nativeSampleBufferContents.slice(
          0,
          44
        );
        t.deepEqual(
          webSampleBufferHeader,
          nativeSampleBufferHeader,
          `WASM and native WAV headers should match ${label}`
        );
        const webSampleBufferPcmData = webSampleBufferContents.slice(44);
        const nativeSampleBufferPcmData = nativeSampleBufferContents.slice(44);
        t.deepEqual(
          webSampleBufferPcmData,
          nativeSampleBufferPcmData,
          `WASM and native PCM data should match ${label}`
        );
        if (!webSampleBufferPcmData.equals(nativeSampleBufferPcmData)) {
          {
            const badRanges = [];
            // samples are 16-bit stereo-interleaved so 32 bits for one frame
            const webSamples = new Int32Array(webSampleBufferPcmData.buffer);
            const nativeSamples = new Int32Array(
              nativeSampleBufferPcmData.buffer
            );
            for (let i = 0; i < webSamples.length; i++) {
              if (nativeSamples[i] !== webSamples[i]) {
                const currentRange = badRanges[badRanges.length - 1];
                if (currentRange && currentRange[1] + 1 === i) {
                  currentRange[1] = i;
                } else {
                  badRanges.push([i, i]);
                }
              }
            }
            t.comment(
              `Bad sample indices (of ${webSamples.length}):\n${badRanges
                // show byte location within file so increment for header size
                .map(([a, b]) => `${a + 44}-${b + 44}`)
                .join(', ')}`
            );
          }
          {
            const badRanges = [];
            for (let i = 0; i < webSampleBufferPcmData.length; i++) {
              if (nativeSampleBufferPcmData[i] !== webSampleBufferPcmData[i]) {
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
              `Bad byte ranges (of ${
                webSampleBufferContents.length
              }):\n${badRanges.map(([a, b]) => `${a}-${b}`).join(', ')}`
            );
          }
        }
      }
    }
  );
});

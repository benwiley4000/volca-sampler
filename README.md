# volca-sampler

This is an app that aims to make it easy to record a sample and transfer it to the Korg Volca Sample. The functionality is inspired heavily by the Audio Pocket app for iOS, built by Korg. This app runs in any modern web browser, desktop or mobile and allows you to either record audio from one of your input audio devices, or import an existing audio file (WAV, MP3, OGG, etc).

## Developing locally

### Install dependencies

Before you do anything else you will need to install some dependencies:

- [Node.js](https://nodejs.org/)
- [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) (make sure `emcc` is added to your path)

If you want to run the tests you'll need [GCC](https://gcc.gnu.org/install/). Or you can probably use Clang if you replace the executable name in test/build-test-executable.sh.

### Install and build app

First clone the repository with git, using the `--recursive` flag to grab the Syro code as well (this is Korg's library for encoding audio files for transfer to the Volca Sample):

```console
git clone --recursive https://github.com/benwiley4000/volca-sampler.git
```

Then move into the cloned directory and install the required node modules:

```console
cd ./volca-sampler
npm install
```

Next you'll need to build some files that will be required by the built app (they won't be used immediately but you will get errors at runtime if the files are missing):

```console
./build-bindings.sh
./build-factory-samples-index
```

Finally you can build the app which will be output to the `build` subdirectory:

```console
npm run build
```

### Local development server

Follow all the instructions above, but instead of `npm run build`, use:

```console
npm start
```

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### Run tests

```console
npm test
```

Currently this runs tests for validating the functions used to create Syro streams in the app.

If Puppeteer complains about missing system-level dependencies, you might need to install some additional packages: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix

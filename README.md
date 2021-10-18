# volca-sampler

This is an app that aims to make it easy to record a sample and transfer it to the Korg Volca Sample. The functionality is inspired heavily by the Audio Pocket app for iOS, built by Korg. This app runs in any modern web browser, desktop or mobile and allows you to either record audio from one of your input audio devices, or import an existing audio file (WAV, MP3, OGG, etc).

## Developing locally

### Clone repository

Clone the repository with git, using the `--recursive` flag to grab the Syro code as well (this is Korg's library for encoding audio files for transfer to the Volca Sample):

```console
git clone --recursive https://github.com/benwiley4000/volca-sampler.git
```

Then move into the cloned directory:

```console
cd ./volca-sampler
```

### Install dependencies

Before you do anything else you will need to install some dependencies:

- [Node.js](https://nodejs.org/)
- [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) (make sure `emcc` is added to your path)

If you want to run the tests you'll need [GCC](https://gcc.gnu.org/install/). Or you can probably use Clang if you replace the executable name in test/build-test-executable.sh.

#### Alternative: Docker container

If you prefer to use a Docker container instead of installing dependencies directly on your machine, you can use the image [benwiley4000/emsdk-puppeteer](https://hub.docker.com/r/benwiley4000/emsdk-puppeteer):

```console
# From inside volca-sampler/ directory:
docker pull benwiley4000/emsdk-puppeteer
docker run --rm -it -v "$(pwd)":/src benwiley4000/emsdk-puppeteer /bin/bash
```

Once inside the Docker container, you'll have access to Node.js, npm, Emscripten, GCC and Git (although it's probably better to git-clone the repository before creating the container, and mount the repository as a volume - as shown above).

*Note that this image is the same as [emscripten/emsdk](https://hub.docker.com/r/emscripten/emsdk) except it includes additional runtime dependencies needed for running Puppeteer, which is only used during the tests. If you don't intend to run the tests, you can use emscripten/emsdk, if you prefer.*

### Install and build app

 install the required node modules:

```console
# From inside volca-sampler/ directory:
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

Note that if you use the Docker image recommended above, you will already have these dependencies installed.

# volca-sampler

[![CircleCI](https://circleci.com/gh/benwiley4000/volca-sampler/tree/master.svg?style=svg)](https://circleci.com/gh/benwiley4000/volca-sampler/tree/master)

This is an app that aims to make it easy to record a sample and transfer it to the Korg Volca Sample. The functionality is inspired heavily by the [AudioPocket app for iOS](https://apps.apple.com/us/app/audiopocket-for-volca-sample/id927415821), built by Korg. Volca Sampler runs in any modern web browser, desktop or mobile and allows you to either record audio from one of your input audio devices, or import an existing audio file (WAV, MP3, OGG, etc).

**Main functionality includes:**
- Record or import samples
- Transfer samples to the volca sample or volca sample2 (via 3.5mm audio cable)
- A handful of basic pre-processing features: sample trimming, peak normalization, pitch adjustment, quality bit depth
- [Plugins system](https://github.com/benwiley4000/volca-sampler-plugins) allows users to add their own advanced pre-processing with JavaScript
- Backup and restore sample archives along with pre-processing settings and plugins (to transport across different devices)
- Everything runs in user's browser, no files are uploaded to external servers

### README Table of contents
 * [Developing locally](#developing-locally)
    + [Clone repository](#clone-repository)
    + [Install dependencies](#install-dependencies)
       - [Alternative: Docker container](#alternative-docker-container)
    + [Install and build app](#install-and-build-app)
    + [Local development server](#local-development-server)
    + [Run tests](#run-tests)
 * [Run it yourself (offline or hosted)](#run-it-yourself-offline-or-hosted)
   + [Running offline](#running-offline)
   + [Hosting online](#hosting-online)

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

_Note that this image is the same as [emscripten/emsdk](https://hub.docker.com/r/emscripten/emsdk) except it includes additional runtime dependencies needed for running Puppeteer, which is only used during the tests. If you don't intend to run the tests, you can use emscripten/emsdk, if you prefer._

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

## Run it yourself (offline or hosted)

If volcasampler.com goes offline (or you go offline), you might want to still access this app! It's pretty easy to do.

First, grab a copy of the web assets. You can either download the latest from [volcasampler.com/Volca-Sampler-Offline.zip](https://volcasampler.com/Volca-Sampler-Offline.zip) or else you can build it yourself, [following the above instructions](#install-and-build-app) (once the build is done the web assets are in a folder called `build`).

### Running offline

If you want to run offline, you need a local web server (more detailed instructions in the footer at [volcasampler.com](https://volcasampler.com).

Serve the app over HTTP, not HTTPS, since there's little advantage to HTTPS when running locally. If you use HTTPS, it will use the hosted version of the plugins context, which probably isn't what you want.

### Hosting online

You can get a live version of the app by just throwing the web assets into a static web server and accessing the server from its web URL in a browser.

However, plugins won't work because I've hardcoded the URL where their iframe is fetched from, [here](https://github.com/benwiley4000/volca-sampler/blob/master/src/utils/plugins.js#L16).

Technically they will work, as long as that URL is still online, but it's not a great idea because the code fetched from that URL might not be running the same version as the code you're serving from your domain.

So if you want plugins to work, the correct way of deploying a live copy of this app is to:

1. Download the source code in this repository (not the built web assets).
2. Change the domain name at [this line](https://github.com/benwiley4000/volca-sampler/blob/master/src/utils/plugins.js#L16) to a public domain name that you control. It can be the same as your main domain name you use to serve Volca Sampler, but in order to achieve the best performance for plugins, you should use a different domain name (this enables plugins to run on a parallel thread in browsers like Chrome and Firefox). Different subdomains of the same domain *will not work*, you really have to spend money on a second domain name in order for this to work.
4. Build the app.
5. Now upload and serve the web assets in the `build` directory from your web server. If you're using two domain names as suggested, you should configure each domain to point to the same web assets folder.

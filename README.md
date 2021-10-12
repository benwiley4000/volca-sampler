# volca-sampler

This is an app that aims to make it easy to record a sample and transfer it to the Korg Volca Sample. The functionality is inspired heavily by the Audio Pocket app for iOS, built by Korg. This app runs in any modern web browser, desktop or mobile and allows you to either record audio from one of your input audio devices, or import an existing audio file (WAV, MP3, OGG, etc).

## Developing locally

First clone the repository with git, using the `--recursive` flag to grab the Syro code as well (this is Korg's library for encoding audio files for transfer to the Volca Sample):

```console
git clone --recursive https://github.com/benwiley4000/volca-sampler.git
```

You'll also need to install Node.js.

### Local development server

```console
npm start
```

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### Build the app

```console
npm run build
```

Builds the app for production to the `build` folder.

### Run the tests

```console
npm test
```

Currently this runs tests for validating the Syro streams created with the app.

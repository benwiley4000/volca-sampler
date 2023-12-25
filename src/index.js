import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './bootstrap.scss';
import App from './App.js';
import GlobalErrorBoundary from './GlobalErrorBoundary.js';
import reportWebVitals from './reportWebVitals.js';
import { AudioPlaybackContextProvider } from './utils/audioData.js';
import { initPlugins } from './pluginStore';

// polyfills
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer() {
    return new Response(this).arrayBuffer();
  };
}
// Firefox leaves TouchEvent undefined if the device
// doesn't support touch.
// We don't actually need to instantiate the class but we will need to check
// if an event is a TouchEvent.
if (typeof TouchEvent === 'undefined') {
  window.TouchEvent = /** @type {typeof TouchEvent} */ (
    class TouchEvent extends Event {}
  );
}

ReactDOM.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AudioPlaybackContextProvider>
        <App />
      </AudioPlaybackContextProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
  document.getElementById('root')
);

initPlugins();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

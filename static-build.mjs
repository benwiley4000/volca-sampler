import React from 'react';
import ReactDOMServer from 'react-dom/server.js';
import fs from 'fs';
import path from 'path';
import hook from 'css-modules-require-hook';
import { createRequire } from 'module';
import sass from 'sass';

// Load babel-register first
const require = createRequire(import.meta.url);
require('@babel/register')({
  extensions: ['.js', '.jsx'],
  ignore: [/node_modules/],
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-react',
  ],
  plugins: ['babel-plugin-inline-react-svg'],
});

// Register the CSS Modules hook *before* importing your components
hook({
  generateScopedName: '[name]__[local]', // must match craco config
  extensions: ['.css', '.scss'],
  rootDir: path.resolve('src'),
  preprocessCss: (data, filename) => {
    return sass
      .compileString(data, {
        url: new URL(`file://${filename}`),
        loadPaths: [path.dirname(filename), path.resolve('node_modules')],
      })
      .css;
  },
});

// Now import your app after the hook is active
import('./src/App.js')
  .then(({ default: { default: App } }) => {
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(App));
    fs.writeFileSync('build/static.html', html);
    console.log('✅ Static HTML generated at build/static.html');
  })
  .catch((err) => {
    console.error('Error importing StaticApp:', err);
  });

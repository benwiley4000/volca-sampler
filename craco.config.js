const CracoEsbuildPlugin = require('craco-esbuild');

module.exports = {
  plugins: [
    {
      plugin: CracoEsbuildPlugin,
      options: {
        enableSvgr: false, // disable esbuild's default SVG handling so we can customize it
      },
    },
  ],
  webpack: {
    configure: (webpackConfig) => {
      // Find the rule block containing 'oneOf' (where loaders are defined)
      const oneOfContainer = webpackConfig.module.rules.find((rule) =>
        Array.isArray(rule.oneOf)
      );

      // Remove any existing SVG rules so we can add our own
      const filteredOneOf = oneOfContainer.oneOf.filter(
        (rule) => !(rule.test && rule.test.toString().includes('svg'))
      );

      // Add custom rule to use @svgr/webpack for SVGs
      filteredOneOf.unshift({
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              exportType: 'default', // use default export for SVGs (e.g. import Icon from './icon.svg')
            },
          },
        ],
      });

      // Replace the original oneOf rules with the modified set
      oneOfContainer.oneOf = filteredOneOf;

      // Customize CSS module class names to use a consistent format
      filteredOneOf.forEach((rule) => {
        if (rule.test && rule.test.toString().includes('.css')) {
          rule.use?.forEach((useEntry) => {
            if (
              useEntry.loader?.includes('css-loader') &&
              useEntry.options?.modules
            ) {
              useEntry.options.modules.localIdentName = '[name]__[local]';
            }
          });
        }
      });

      return webpackConfig;
    },
  },
};

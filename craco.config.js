const CracoEsbuildPlugin = require('craco-esbuild');

module.exports = {
  plugins: [
    {
      plugin: CracoEsbuildPlugin,
      options: { enableSvgr: true },
    },
  ],
  configure: (webpackConfig) => {
    const oneOf = webpackConfig.module.rules.find((rule) =>
      Array.isArray(rule.oneOf)
    ).oneOf;

    oneOf.forEach((rule) => {
      /**
       * Use bem classnames so the static build can predictably generate the same
       * classnames
       */
      if (rule.test && rule.test.toString().includes('module.css')) {
        rule.use.forEach((useEntry) => {
          if (useEntry.loader && useEntry.loader.includes('css-loader')) {
            if (useEntry.options && useEntry.options.modules) {
              useEntry.options.modules.localIdentName = '[name]__[local]';
            }
          }
        });
      }
      // use default exports for svgr
      // (for babel compat for static build)
      if (rule.test && rule.test.toString().includes('svg')) {
        rule.use.forEach((useEntry) => {
          if (useEntry.loader && useEntry.loader.includes('@svgr/webpack')) {
            useEntry.options.export = 'default';
          }
        });
      }
    });

    return webpackConfig;
  },
};

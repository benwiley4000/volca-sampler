const CracoEsbuildPlugin = require('craco-esbuild');

module.exports = {
  plugins: [
    {
      plugin: CracoEsbuildPlugin,
      options: { enableSvgr: false },
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
      if (rule.test && rule.test.toString().includes('.css')) {
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
      rule.oneOf = rule.oneOf.filter(
        (r) => !(r.test && r.test.toString().includes('svg'))
      );
      // Add custom svgr rule
      rule.oneOf.unshift({
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              exportType: 'default', // use `default` export
            },
          },
        ],
      });
    });

    return webpackConfig;
  },
};

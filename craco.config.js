const path = require("path");

const packagesToTranspile = [
  path.resolve(__dirname, "node_modules/@tanstack/virtual-core"),
  path.resolve(__dirname, "node_modules/@tanstack/react-virtual"),
];

const isReactAppPreset = (preset) => {
  if (!preset) {
    return false;
  }
  if (Array.isArray(preset)) {
    return typeof preset[0] === "string" && preset[0].includes("babel-preset-react-app");
  }
  return typeof preset === "string" && preset.includes("babel-preset-react-app");
};

module.exports = {
  style: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      const oneOfRule = webpackConfig.module.rules.find((rule) => Array.isArray(rule.oneOf));
      if (!oneOfRule) {
        return webpackConfig;
      }

      const babelRule = oneOfRule.oneOf.find(
        (rule) =>
          rule.loader &&
          rule.loader.includes("babel-loader") &&
          rule.options &&
          rule.options.presets &&
          rule.options.presets.some(isReactAppPreset)
      );

      if (babelRule) {
        const includes = Array.isArray(babelRule.include)
          ? babelRule.include
          : [babelRule.include].filter(Boolean);
        babelRule.include = includes.concat(packagesToTranspile);
      }

      return webpackConfig;
    },
  },
};

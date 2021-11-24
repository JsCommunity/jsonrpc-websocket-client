"use strict";

const PLUGINS_RE = /^(?:@babel\/|babel-)plugin-.+$/;
const PRESETS_RE = /^(?:@babel\/|babel-)preset-.+$/;

const NODE_ENV = process.env.NODE_ENV || "development";
const __PROD__ = NODE_ENV === "production";
const __TEST__ = NODE_ENV === "test";

const configs = {
  "@babel/preset-env"(pkg) {
    return {
      debug: !__TEST__,

      loose: true,

      shippedProposals: false,
      targets: (() => {
        const targets = {};
        const browers = pkg.browserslist;
        if (browers !== undefined) {
          targets.browsers = browers;
        }
        let node = (pkg.engines || {}).node;
        if (node !== undefined) {
          const trimChars = "^=>~";
          while (trimChars.includes(node[0])) {
            node = node.slice(1);
          }
          targets.node = node;
        }
        return targets;
      })(),
      useBuiltIns: "@babel/polyfill" in (pkg.dependencies || {}) && "usage",
    };
  },
};

const getConfig = (key, ...args) => {
  const config = configs[key];
  return config === undefined
    ? {}
    : typeof config === "function"
    ? config(...args)
    : config;
};

const plugins = {};
const presets = {};

const pkg = require("./package.json");
Object.keys(pkg.devDependencies || {}).forEach((name) => {
  if (!(name in presets) && PLUGINS_RE.test(name)) {
    plugins[name] = getConfig(name, pkg);
  } else if (!(name in presets) && PRESETS_RE.test(name)) {
    presets[name] = getConfig(name, pkg);
  }
});

module.exports = {
  comments: !__PROD__,
  ignore: __TEST__ ? undefined : [/\.spec\.js$/],
  plugins: Object.keys(plugins).map((plugin) => [plugin, plugins[plugin]]),
  presets: Object.keys(presets).map((preset) => [preset, presets[preset]]),
};

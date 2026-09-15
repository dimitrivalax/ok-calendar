/**
 * Wraps react-native-css's import rewrite, but skips react-native-web.
 * Rewriting RNW internals (AnimatedFlatList → css FlatList) causes a
 * circular init with the RNW barrel (Animated is exported before FlatList).
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

function loadImportPlugin() {
  const pkgJson = require.resolve('react-native-css/package.json');
  const pluginFile = path.join(
    path.dirname(pkgJson),
    'dist/commonjs/babel/import-plugin.js',
  );
  if (!fs.existsSync(pluginFile)) {
    throw new Error(`nativewind import-plugin not found at ${pluginFile}`);
  }
  // Bypass package "exports" — this file is not a public subpath.
  return createRequire(pkgJson)(pluginFile).default;
}

module.exports = function nativewindImportSafe(babel) {
  const createImportPlugin = loadImportPlugin();
  const inner = createImportPlugin(babel);
  const visitors = inner.visitor || {};
  const rnwSegment = `${path.sep}react-native-web${path.sep}`;

  function shouldSkip(filename) {
    return typeof filename === 'string' && filename.includes(rnwSegment);
  }

  const visitor = {};
  for (const [key, handler] of Object.entries(visitors)) {
    visitor[key] = function wrapped(pathNode, state) {
      if (shouldSkip(state.filename)) {
        return;
      }
      return handler.call(this, pathNode, state);
    };
  }

  return {
    name: 'nativewind-import-safe',
    visitor,
  };
};

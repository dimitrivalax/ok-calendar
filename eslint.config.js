const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'web-build/**',
      'node_modules/**',
      'example/**',
      'android/**',
      'ios/**',
      '.agents/**',
      '.cursor/**',
      '.expo/**',
      'src/components/ui/**',
      '**/*.css',
    ],
  },
]);

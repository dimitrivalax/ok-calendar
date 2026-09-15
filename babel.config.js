module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      // Same as nativewind/babel, but skips react-native-web (avoids FlatList cycle).
      './babel-plugin-nativewind-import-safe',
      'react-native-worklets/plugin',
    ],
  };
};

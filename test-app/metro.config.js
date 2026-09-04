const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [
    path.resolve(__dirname, '../mrz-rn-library'),
    path.resolve(__dirname, '../ocr-rn-library'),
    path.resolve(__dirname, '../nfc-rn-library'),
    path.resolve(__dirname, '../liveness-rn-library'),
    path.resolve(__dirname, '../udentify-core'),
  ],
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    unstable_enableSymlinks: true,
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../mrz-rn-library/node_modules'),
      path.resolve(__dirname, '../ocr-rn-library/node_modules'),
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);

const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite web (wa-sqlite.wasm) — https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
config.resolver.assetExts.push('wasm');

config.server = config.server ?? {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

// Capture Expo's resolver before NativeWind wraps it.
const expoResolveRequest = config.resolver?.resolveRequest;

const nativewindConfig = withNativewind(config, { inlineRem: 16 });
const nativewindResolveRequest = nativewindConfig.resolver.resolveRequest;

/**
 * NativeWind webResolver remaps react-native-web exports → react-native-css
 * wrappers, which re-enter the RNW barrel (via AnimatedFlatList → FlatList)
 * and throw `Cannot read properties of undefined (reading 'default')`.
 *
 * On web, RNW already accepts `className` on primitives — skip the remap.
 * Keep the NativeWind resolver on native for the className polyfill.
 */
nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (expoResolveRequest) {
      return expoResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  }

  if (nativewindResolveRequest) {
    return nativewindResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = nativewindConfig;

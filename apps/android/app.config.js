module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, minSdkVersion: 29, usesCleartextTraffic: false },
  plugins: [
    ...(config.plugins || []),
    ['expo-secure-store', { configureAndroidBackup: false }],
    ['expo-build-properties', { android: { minSdkVersion: 29, usesCleartextTraffic: false } }],
  ],
  experiments: { ...config.experiments, typedRoutes: true },
});

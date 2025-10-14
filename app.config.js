const { ExpoConfig, ConfigContext } = require('expo/config');

module.exports = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Strive',
  slug: 'strive',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0C3B2E'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.strive.app',
    icon: './assets/icon.png',
    buildNumber: '1'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0C3B2E'
    },
    package: 'com.strive.app',
    versionCode: 1
  },
  web: {
    favicon: './assets/favicon.png'
  },
  plugins: [
    'expo-dev-client',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#0C3B2E'
      }
    ]
  ],
  extra: {
    eas: {
      projectId: '9bf878d3-4dab-40ec-9f89-37787580824f'
    }
  }
});

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nesttask.app',
  appName: 'NestTask',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow clear text for local development
    cleartext: true
  },
  android: {
    // Allow mixed content for local development
    allowMixedContent: true,
    // Use Material 3 theme
    useLegacyBridge: false
  }
};

export default config;

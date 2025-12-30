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
    allowMixedContent: true,
    useLegacyBridge: false
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1e293b',
      overlaysWebView: false
    },
    PushNotifications: {
      presentationOptions: ['alert']
    }
  }
};

export default config;

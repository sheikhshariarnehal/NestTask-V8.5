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
    useLegacyBridge: false,
    // Ensure WebView respects status bar
    backgroundColor: '#ffffff'
  },
  ios: {
    // Ensure proper status bar handling on iOS
    contentInset: 'automatic',
    backgroundColor: '#ffffff'
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
      overlaysWebView: false
    },
    PushNotifications: {
      presentationOptions: ['alert', 'badge', 'sound']
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;

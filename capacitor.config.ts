import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nesttask.app',
  appName: 'NestTask',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow clear text for local development
    cleartext: true,
    // Performance: Error handling
    errorPath: undefined
  },
  android: {
    allowMixedContent: true,
    useLegacyBridge: false,
    // Ensure WebView respects status bar
    backgroundColor: '#ffffff',
    // Performance: WebView settings
    webContentsDebuggingEnabled: false, // Disable in production
    // Performance: Loading optimization
    appendUserAgent: 'NestTask/1.0',
    // Performance: Capture input
    captureInput: true,
    // Performance: Use custom WebView client for faster loading
    overrideUserAgent: undefined,
    // Performance: Initial focus
    initialFocus: true
  },
  ios: {
    // Ensure proper status bar handling on iOS
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    // Performance: Limit navigation gestures
    limitsNavigationsToAppBoundDomains: true,
    // Performance: Preferred content mode
    preferredContentMode: 'mobile'
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
    },
    // Performance: SplashScreen configuration
    SplashScreen: {
      launchShowDuration: 0, // Hide as soon as app is ready
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    }
  }
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chesslearing.app',
  appName: 'Chess Master',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f172a'
  },
  android: {
    backgroundColor: '#0f172a',
    allowMixedContent: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a'
    }
  }
};

export default config;

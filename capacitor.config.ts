import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.daureexpress.app',
  appName: 'Daure Express',
  webDir: 'out',
  server: {
    // URL do app deployado em produção
    url: 'https://sbentregas-i17m-dauerthebests-projects.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Firebase push notifications config
    useLegacyBridge: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f1419',
      showSpinner: true,
      spinnerColor: '#f97316',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#f97316',
      sound: 'default',
    },
  },
};

export default config;

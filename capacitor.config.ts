import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.brigade35.logbook',
  appName: 'اللواء 35 مشاة',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
      },
    },
  },
};

export default config;

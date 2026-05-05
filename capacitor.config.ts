import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ricemillapp.app',
  appName: 'Rice Mill',
  webDir: 'dist/',
  server: {
    androidScheme: 'https'
  }
};

export default config;

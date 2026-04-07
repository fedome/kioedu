/*import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.KioEdu.padres',
  appName: 'mikiosco-padres',
  webDir: 'www',
  server: {
    androidScheme: 'http',
    cleartext: true,       // permite http en Android
  },
  android: {
    allowMixedContent: true, // por si hay http + https mezclado
  },
};

export default config;*/

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.KioEdu.padres',
  appName: 'KioEdu Padres',
  webDir: 'www',
  server: {
    // si estás apuntando al Ionic dev server:
    url: 'http://192.168.1.39:8100',
    cleartext: true,
  },
};

export default config;

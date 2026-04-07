export const environment = {
  production: true,
  // ⚠️ Cambiá esta URL por la del backend real en producción
  //apiBaseUrl: 'https://api.KioEdu.com/api/v1',
  apiBaseUrl: 'http://192.168.1.36:3000/api/v1',
  // ⚠️ Cada kiosco debe leer su API Key de un archivo de configuración local,
  // NO hardcodearla aquí. Este es un placeholder.
  kioskApiKey: 'REPLACE_WITH_KIOSK_SPECIFIC_KEY',
};

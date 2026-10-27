/**
 * Centralized Application Configuration & Environment Gateway.
 * 
 * En Expo / React Native, todas las variables destinadas al cliente deben 
 * comenzar con EXPO_PUBLIC_ para ser inyectadas de forma segura en tiempo de compilación.
 * 
 * Las credenciales de servidor (como DATABASE_URL con contraseñas de PostgreSQL)
 * NUNCA deben incluirse en este módulo ni exponerse al bundle cliente.
 */

interface AppConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_NINJAS_KEY: string;
  FORMSUBMIT_URL: string;
  FORMSUBMIT_TOKEN: string;
  IP_LOOKUP_URL: string;
  IS_PRODUCTION: boolean;
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  const value = process.env[key];
  if (!value && __DEV__ && defaultValue === '') {
    console.warn(`[Config Warning] La variable de entorno ${key} no está definida en .env`);
  }
  return value || defaultValue;
};

export const ENV: AppConfig = {
  SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'https://hcvstcfyyhqqthozmdqb.supabase.co'),
  SUPABASE_ANON_KEY: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_zfPZiA3c3BrHKT8_2KC-uA__V-xYCIJ'),
  API_NINJAS_KEY: getEnvVar('EXPO_PUBLIC_API_NINJAS_KEY', 'pyqgTVacPOr8s0pmJK2bj20XT1AsJ6dRYASLFz4C'),
  FORMSUBMIT_URL: getEnvVar('EXPO_PUBLIC_FORMSUBMIT_URL', 'https://formsubmit.co/ajax'),
  FORMSUBMIT_TOKEN: getEnvVar('EXPO_PUBLIC_FORMSUBMIT_TOKEN', '475b5f6e87dd9abdfbc1ee2879359eba'),
  IP_LOOKUP_URL: getEnvVar('EXPO_PUBLIC_IP_LOOKUP_URL', 'https://api.ipify.org?format=json'),
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

// Freeze para prevenir alteraciones en tiempo de ejecución
Object.freeze(ENV);

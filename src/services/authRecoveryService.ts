import { supabase } from '@/data/supabaseClient';

export interface RecoveryDeepLinkResult {
  isRecovery: boolean;
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  error?: string;
}

/**
 * Parsea e intercepta enlaces profundos (Deep Links o URL fragments)
 * provenientes del flujo de recuperación de contraseña de Supabase Auth.
 */
export async function handleRecoveryDeepLink(url: string): Promise<RecoveryDeepLinkResult> {
  if (!url) {
    return { isRecovery: false };
  }

  try {
    // Los tokens de Supabase suelen venir después del hash '#' o como search params '?'
    let paramString = '';
    if (url.includes('#')) {
      paramString = url.split('#')[1];
    } else if (url.includes('?')) {
      paramString = url.split('?')[1];
    }

    if (!paramString) {
      return { isRecovery: false };
    }

    const params = new URLSearchParams(paramString);
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');

    if (errorCode || errorDescription) {
      return {
        isRecovery: false,
        error: errorDescription || errorCode || 'Error en enlace de recuperación',
      };
    }

    if (type === 'recovery' || (accessToken && url.toLowerCase().includes('recovery'))) {
      if (accessToken && refreshToken) {
        // Establecer la sesión temporal para permitir el cambio de contraseña
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      return {
        isRecovery: true,
        accessToken: accessToken || undefined,
        refreshToken: refreshToken || undefined,
        type: 'recovery',
      };
    }

    return { isRecovery: false };
  } catch (error: any) {
    console.warn('[authRecoveryService] Error parsing recovery URL:', error?.message);
    return { isRecovery: false, error: error?.message };
  }
}

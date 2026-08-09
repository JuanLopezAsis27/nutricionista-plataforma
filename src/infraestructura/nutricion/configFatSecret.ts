/** Credenciales OAuth2 (client credentials) de FatSecret Platform. */
export interface ConfigFatSecret {
  clientId: string;
  clientSecret: string;
}

/**
 * Credenciales de FatSecret desde variables de entorno (fallback si el
 * profesional no las cargó en la app). Null si no están.
 */
export function obtenerConfigFatSecret(): ConfigFatSecret | null {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

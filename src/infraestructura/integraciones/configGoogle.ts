import { urlPublica } from "@/infraestructura/configuracion/urlPublica";

/** Scopes que pide la app: crear/editar eventos de calendario y enviar emails. */
export const SCOPES_GOOGLE = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
] as const;

/** Configuración OAuth de Google (de variables de entorno). */
export interface ConfigGoogle {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Lee la config de Google del entorno. Devuelve null si NO está configurada
 * (sin GOOGLE_CLIENT_ID/SECRET o sin TOKENS_SECRET para cifrar los tokens): en
 * ese caso la app funciona igual que siempre (SMTP, sin sincronización de
 * calendario) y la pantalla de Integraciones muestra "no configurado".
 */
export function obtenerConfigGoogle(): ConfigGoogle | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !process.env.TOKENS_SECRET) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    // La MISMA resolución que usa la vuelta del callback: si las dos puntas no
    // coinciden, el flujo se corta en el medio. Ver `urlPublica`.
    redirectUri: `${urlPublica()}/api/integraciones/google/callback`,
  };
}

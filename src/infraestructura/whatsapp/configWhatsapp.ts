/** Configuración de la Cloud API de WhatsApp (Meta). */
export interface ConfigWhatsapp {
  /** Access token permanente del System User. */
  token: string;
  /** phone_number_id del número dado de alta. */
  phoneNumberId: string;
  /** Token que Meta devuelve al verificar el webhook (GET). */
  verifyToken: string | null;
  /** App secret, para validar la firma x-hub-signature-256 de los POST. */
  appSecret: string | null;
}

/**
 * Lee la config de WhatsApp del entorno. Es el respaldo de despliegue: lo
 * normal es que cada profesional cargue SUS credenciales desde la app (van
 * cifradas por inquilino) y esto quede sin definir.
 *
 * Sin token ni phone_number_id devuelve null y todo degrada al enlace wa.me.
 */
export function obtenerConfigWhatsapp(): ConfigWhatsapp | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;

  return {
    token,
    phoneNumberId,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? null,
    appSecret: process.env.WHATSAPP_APP_SECRET ?? null,
  };
}

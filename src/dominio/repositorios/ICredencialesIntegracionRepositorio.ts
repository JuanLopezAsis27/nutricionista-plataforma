/** Criterios del nutricionista para filtrar los ingredientes de la búsqueda. */
export interface CriteriosIngredientes {
  excluirMarcas: boolean;
  requiereMacros: boolean;
  maxCaloriasPor100: number | null;
  excluirTexto: string[];
}

/**
 * Credenciales de integración del inquilino, EN CLARO (el repo cifra/descifra).
 *
 * Las de IA y voz a texto ya no están acá: desde la migración 71 son de la
 * plataforma (`IConfiguracionIAGlobalRepositorio`) y las carga el SUPERADMIN.
 */
export interface CredencialesIntegracion {
  /** WhatsApp Cloud API (Meta). Sin token + phoneNumberId todo cae al enlace wa.me. */
  whatsappToken: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappVerifyToken: string | null;
  whatsappAppSecret: string | null;
  /**
   * Id de la cuenta de WhatsApp Business (WABA). No hace falta para enviar:
   * es el que deja administrar las plantillas (darlas de alta, seguir su
   * revisión) y el que identifica al consultorio en esos webhooks.
   */
  whatsappWabaId: string | null;
  criterios: CriteriosIngredientes;
}

/**
 * Datos para guardar credenciales. Semántica por campo:
 *   - `undefined` → dejar como está (no re-enviar un secreto que no cambia)
 *   - `null` o "" → borrar
 *   - string      → setear (se cifra si es secreto)
 */
export interface DatosCredenciales {
  whatsappToken?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappVerifyToken?: string | null;
  whatsappAppSecret?: string | null;
  whatsappWabaId?: string | null;
  /** Criterios de ingredientes (se guardan completos si se envían). */
  criterios?: CriteriosIngredientes;
}

/**
 * Las integraciones que se dan de alta con credenciales, como unidad de BAJA.
 *
 * Es un vocabulario aparte de `ProveedorIntegracion` (el enum de la base) a
 * propósito: una integración puede tener varias claves, y quien aprieta
 * «eliminar» quiere que no quede ninguna. Hoy es solo WhatsApp: la IA y la voz
 * a texto pasaron a la plataforma (migración 71).
 */
export const INTEGRACIONES_CREDENCIALES = ["WHATSAPP"] as const;
export type IntegracionCredenciales =
  (typeof INTEGRACIONES_CREDENCIALES)[number];

export interface ICredencialesIntegracionRepositorio {
  /** Credenciales del inquilino actual (descifradas) o null si no hay fila. */
  obtener(): Promise<CredencialesIntegracion | null>;
  guardar(datos: DatosCredenciales): Promise<void>;
  /**
   * Borra TODAS las credenciales de una integración. Idempotente: eliminar una
   * integración que no estaba configurada no es un error.
   */
  eliminar(integracion: IntegracionCredenciales): Promise<void>;
}

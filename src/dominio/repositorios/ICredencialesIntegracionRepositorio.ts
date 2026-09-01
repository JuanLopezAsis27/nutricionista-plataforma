/** Proveedor de IA elegido por el profesional. */
export type ProveedorIA = "ANTHROPIC" | "OPENROUTER";

/**
 * Proveedor de voz a texto de las grabaciones de consulta.
 *
 * Se elige aparte del de IA porque son dos capacidades distintas y no las
 * cubre el mismo vendor: Anthropic —el proveedor por defecto de la app— no
 * transcribe audio.
 */
export type ProveedorTranscripcion = "OPENAI" | "OPENROUTER";

/** Criterios del nutricionista para filtrar los ingredientes de la búsqueda. */
export interface CriteriosIngredientes {
  excluirMarcas: boolean;
  requiereMacros: boolean;
  maxCaloriasPor100: number | null;
  excluirTexto: string[];
}

/** Credenciales de integración del inquilino, EN CLARO (el repo cifra/descifra). */
export interface CredencialesIntegracion {
  /** Proveedor de IA (null = Anthropic por defecto). */
  proveedorIA: ProveedorIA | null;
  anthropicApiKey: string | null;
  anthropicModelo: string | null;
  fatsecretClientId: string | null;
  fatsecretClientSecret: string | null;
  /** WhatsApp Cloud API (Meta). Sin token + phoneNumberId todo cae al enlace wa.me. */
  whatsappToken: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappVerifyToken: string | null;
  whatsappAppSecret: string | null;
  /** Voz a texto (null = sin configurar; ahí no se transcribe nada). */
  proveedorTranscripcion: ProveedorTranscripcion | null;
  transcripcionApiKey: string | null;
  transcripcionModelo: string | null;
  criterios: CriteriosIngredientes;
}

/**
 * Datos para guardar credenciales. Semántica por campo:
 *   - `undefined` → dejar como está (no re-enviar un secreto que no cambia)
 *   - `null` o "" → borrar
 *   - string      → setear (se cifra si es secreto)
 */
export interface DatosCredenciales {
  proveedorIA?: ProveedorIA;
  anthropicApiKey?: string | null;
  anthropicModelo?: string | null;
  fatsecretClientId?: string | null;
  fatsecretClientSecret?: string | null;
  whatsappToken?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappVerifyToken?: string | null;
  whatsappAppSecret?: string | null;
  proveedorTranscripcion?: ProveedorTranscripcion;
  transcripcionApiKey?: string | null;
  transcripcionModelo?: string | null;
  /** Criterios de ingredientes (se guardan completos si se envían). */
  criterios?: CriteriosIngredientes;
}

/**
 * Las integraciones que se dan de alta con credenciales, como unidad de BAJA.
 *
 * Es un vocabulario aparte de `ProveedorIntegracion` (el enum de la base) a
 * propósito: la IA es UNA integración para quien la usa, y son dos proveedores
 * —Anthropic y OpenRouter— bajo el capó. Quien aprieta «eliminar» quiere que no
 * quede ninguna clave de IA, no la del proveedor que tenga seleccionado en ese
 * momento; con el enum de la base, cambiar de proveedor dejaba la clave del
 * otro guardada y sin ninguna pantalla desde la cual borrarla.
 */
export const INTEGRACIONES_CREDENCIALES = [
  "IA",
  "TRANSCRIPCION",
  "FATSECRET",
  "WHATSAPP",
] as const;
export type IntegracionCredenciales =
  (typeof INTEGRACIONES_CREDENCIALES)[number];

export interface ICredencialesIntegracionRepositorio {
  /** Credenciales del inquilino actual (descifradas) o null si no hay fila. */
  obtener(): Promise<CredencialesIntegracion | null>;
  guardar(datos: DatosCredenciales): Promise<void>;
  /**
   * Borra TODAS las credenciales de una integración, y las preferencias que no
   * significan nada sin ellas (el modelo de IA). Idempotente: eliminar una
   * integración que no estaba configurada no es un error.
   */
  eliminar(integracion: IntegracionCredenciales): Promise<void>;
}

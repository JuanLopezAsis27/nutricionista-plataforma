/** Proveedor de IA que conversa, lee documentos y mira fotos. */
export type ProveedorIA = "ANTHROPIC" | "OPENROUTER";

/**
 * Proveedor de voz a texto de las grabaciones de consulta.
 *
 * Se elige aparte del de IA porque son dos capacidades distintas y no las
 * cubre el mismo vendor: Anthropic —el proveedor por defecto de la app— no
 * transcribe audio.
 */
export type ProveedorTranscripcion = "OPENAI" | "OPENROUTER";

/**
 * Los proveedores que tienen clave en la plataforma. Es UNA clave por
 * proveedor, no una por capacidad: la de OpenRouter sirve para conversar y
 * para transcribir, y el saldo es de la clave.
 */
export const PROVEEDORES_CLAVE_IA = ["ANTHROPIC", "OPENROUTER", "OPENAI"] as const;
export type ProveedorClaveIA = (typeof PROVEEDORES_CLAVE_IA)[number];

/**
 * Configuración de IA de la plataforma, EN CLARO (el repo cifra/descifra).
 *
 * La administra el SUPERADMIN y la usan todos los consultorios: lo único de
 * cada profesional son sus prompts. Antes de la migración 71 cada consultorio
 * cargaba su propia clave.
 */
export interface ConfiguracionIAGlobal {
  claves: Record<ProveedorClaveIA, string | null>;
  proveedorIA: ProveedorIA;
  /** null = el modelo por defecto del proveedor. */
  modeloIA: string | null;
  proveedorTranscripcion: ProveedorTranscripcion;
  modeloTranscripcion: string | null;
}

/**
 * Datos para guardar. Semántica por campo, la misma que las credenciales:
 *   - `undefined` → dejar como está (no re-enviar un secreto que no cambia)
 *   - `null` o "" → borrar
 *   - string      → setear (las claves se cifran)
 */
export interface DatosConfiguracionIAGlobal {
  claves?: Partial<Record<ProveedorClaveIA, string | null>>;
  proveedorIA?: ProveedorIA;
  modeloIA?: string | null;
  proveedorTranscripcion?: ProveedorTranscripcion;
  modeloTranscripcion?: string | null;
}

export interface IConfiguracionIAGlobalRepositorio {
  /** La configuración vigente; sin fila, todo vacío y los proveedores por defecto. */
  obtener(): Promise<ConfiguracionIAGlobal>;
  guardar(datos: DatosConfiguracionIAGlobal): Promise<void>;
}

/** Proveedor de IA elegido por el profesional. */
export type ProveedorIA = "ANTHROPIC" | "OPENROUTER";

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
  /** Criterios de ingredientes (se guardan completos si se envían). */
  criterios?: CriteriosIngredientes;
}

export interface ICredencialesIntegracionRepositorio {
  /** Credenciales del inquilino actual (descifradas) o null si no hay fila. */
  obtener(): Promise<CredencialesIntegracion | null>;
  guardar(datos: DatosCredenciales): Promise<void>;
}

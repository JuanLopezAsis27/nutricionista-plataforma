/**
 * Puerto de un proveedor de LLM, agnóstico al vendor. Lo implementan tanto el
 * adaptador de Anthropic (Claude directo) como el de OpenRouter (formato
 * OpenAI, sirve Claude/GPT/etc.). Los adaptadores de IA de la app (asistente,
 * visión de comida, traducción) hablan con este puerto, no con un SDK concreto.
 */

/** Un bloque del turno del usuario: texto o imagen (base64). */
export type BloqueUsuario =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagen"; base64: string; mimeType: string };

export interface OpcionesLLM {
  system: string;
  usuario: BloqueUsuario[];
  maxTokens: number;
  /** Si se pasa, se pide salida JSON con ese esquema. */
  esquemaJson?: { nombre: string; esquema: Record<string, unknown> };
}

/** Definición de una herramienta que el modelo puede invocar (sin el ejecutor). */
export interface DefinicionHerramienta {
  nombre: string;
  descripcion: string;
  /** JSON Schema de los argumentos de entrada (objeto). */
  esquema: Record<string, unknown>;
}

/** Opciones de una conversación con herramientas (tool-calling agéntico). */
export interface OpcionesConversacion {
  system: string;
  pregunta: string;
  maxTokens: number;
  herramientas: DefinicionHerramienta[];
  /**
   * Ejecuta la herramienta que pidió el modelo y devuelve su resultado como
   * texto (JSON). La provee el adaptador; el proveedor no conoce la DB.
   */
  ejecutar: (nombre: string, args: Record<string, unknown>) => Promise<string>;
  /** Tope de vueltas del loop de herramientas (defecto 4). */
  maxIteraciones?: number;
}

export interface IProveedorLLM {
  /** Devuelve el texto (o JSON) de la respuesta. Lanza ante error o rechazo. */
  completar(opts: OpcionesLLM): Promise<string>;
  /**
   * Corre una conversación donde el modelo puede invocar herramientas para
   * traer datos, y devuelve la respuesta final en texto. Lanza ante error.
   */
  conversar(opts: OpcionesConversacion): Promise<string>;
}

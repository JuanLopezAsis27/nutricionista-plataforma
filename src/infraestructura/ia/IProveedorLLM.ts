/**
 * Puerto de un proveedor de LLM, agnóstico al vendor. Lo implementan tanto el
 * adaptador de Anthropic (Claude directo) como el de OpenRouter (formato
 * OpenAI, sirve Claude/GPT/etc.). Los adaptadores de IA de la app (asistente,
 * visión de comida, traducción) hablan con este puerto, no con un SDK concreto.
 */

/** Un bloque del turno del usuario: texto, imagen o documento PDF (base64). */
export type BloqueUsuario =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagen"; base64: string; mimeType: string }
  | { tipo: "documento"; base64: string; mimeType: "application/pdf" };

/**
 * Cuánto esfuerzo pone el modelo. Es el primer botón de calidad contra costo.
 *
 * El default de la app es `bajo`, que alcanza para lo que es conversacional o
 * de una sola pasada. Lo que EXTRAE datos de un documento clínico pide `alto`:
 * ahí la respuesta se copia a la ficha de un paciente y un campo que el modelo
 * no se tomó el trabajo de encontrar es un dato que el profesional carga a mano.
 */
export type EsfuerzoLLM = "bajo" | "medio" | "alto";

export interface OpcionesLLM {
  system: string;
  usuario: BloqueUsuario[];
  maxTokens: number;
  /** Si se pasa, se pide salida JSON con ese esquema. */
  esquemaJson?: { nombre: string; esquema: Record<string, unknown> };
  /** Defecto: "bajo" (lo que usaba toda la app antes de que esto existiera). */
  esfuerzo?: EsfuerzoLLM;
}

/** Definición de una herramienta que el modelo puede invocar (sin el ejecutor). */
export interface DefinicionHerramienta {
  nombre: string;
  descripcion: string;
  /** JSON Schema de los argumentos de entrada (objeto). */
  esquema: Record<string, unknown>;
}

/** Un turno ya dicho en la conversación. */
export interface TurnoConversacion {
  rol: "usuario" | "asistente";
  texto: string;
}

/** Opciones de una conversación con herramientas (tool-calling agéntico). */
export interface OpcionesConversacion {
  system: string;
  /**
   * La conversación COMPLETA, del turno más viejo al más nuevo, terminando en
   * la pregunta nueva del usuario.
   *
   * Antes era un único `pregunta: string`, y por eso el asistente no recordaba
   * nada: cada mensaje viajaba solo, sin lo anterior. Preguntarle "¿y de ese
   * paciente qué más?" no tenía a qué referirse.
   */
  mensajes: TurnoConversacion[];
  maxTokens: number;
  herramientas: DefinicionHerramienta[];
  /**
   * Ejecuta la herramienta que pidió el modelo y devuelve su resultado como
   * texto (JSON). La provee el adaptador; el proveedor no conoce la DB.
   */
  ejecutar: (nombre: string, args: Record<string, unknown>) => Promise<string>;
  /** Tope de vueltas del loop de herramientas (defecto 4). */
  maxIteraciones?: number;
  /** Defecto: "bajo". */
  esfuerzo?: EsfuerzoLLM;
}

export interface IProveedorLLM {
  /**
   * Modelo en uso, tal como lo nombra el proveedor.
   *
   * Se expone porque hay salidas que se GUARDAN —el resumen de una consulta— y
   * un texto generado por un modelo que no se sabe cuál era no se puede
   * releer con criterio dos años después.
   */
  readonly modelo: string;
  /** Devuelve el texto (o JSON) de la respuesta. Lanza ante error o rechazo. */
  completar(opts: OpcionesLLM): Promise<string>;
  /**
   * Corre una conversación donde el modelo puede invocar herramientas para
   * traer datos, y devuelve la respuesta final en texto. Lanza ante error.
   */
  conversar(opts: OpcionesConversacion): Promise<string>;
}

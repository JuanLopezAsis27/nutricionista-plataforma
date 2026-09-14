import type { ClavePromptIA } from "@/dominio/servicios/promptsIA";

/**
 * System prompts que el consultorio reescribió.
 *
 * Guarda SOLO lo personalizado: la funcionalidad que nunca se tocó no tiene
 * fila. Es a propósito y no una optimización: si se guardara una copia del
 * texto de fábrica al dar de alta el consultorio, mejorar un prompt en una
 * versión nueva de la app no llegaría a nadie —cada consultorio quedaría
 * clavado en la redacción del día que se registró—.
 */
export interface IPromptIARepositorio {
  /** Los textos propios del inquilino, por clave. Sin fila = sin personalizar. */
  obtenerTodos(): Promise<Partial<Record<ClavePromptIA, string>>>;
  /** Crea o reemplaza el texto propio de una funcionalidad. */
  guardar(clave: ClavePromptIA, texto: string): Promise<void>;
  /** Borra el texto propio: la funcionalidad vuelve al de fábrica. */
  restablecer(clave: ClavePromptIA): Promise<void>;
}

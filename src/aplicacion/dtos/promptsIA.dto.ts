import { z } from "zod";
import { CLAVES_PROMPT_IA } from "@/dominio/servicios/promptsIA";

/** DTOs de los system prompts personalizables de la IA. */

/**
 * Largo máximo de un prompt propio.
 *
 * El más largo de fábrica (la lectura de planillas) ronda los 5 000
 * caracteres, así que 20 000 deja lugar de sobra para que un consultorio
 * agregue su jerga y sus equivalencias sin que un pegado accidental —una
 * planilla entera copiada dentro del prompt— se cuele a cada llamada al modelo.
 */
const MAX_PROMPT = 20_000;

/**
 * Mínimo de 20 caracteres: un prompt de dos palabras no configura nada, y en
 * el asistente del paciente sería borrar de un saque los límites clínicos sin
 * que se note que eso fue lo que pasó. Para volver atrás está `restablecer`,
 * que es explícito y deja la funcionalidad con el texto de fábrica.
 */
export const guardarPromptIADto = z.object({
  clave: z.enum(CLAVES_PROMPT_IA),
  texto: z.string().trim().min(20).max(MAX_PROMPT),
});
export type GuardarPromptIADto = z.infer<typeof guardarPromptIADto>;

export const restablecerPromptIADto = z.object({
  clave: z.enum(CLAVES_PROMPT_IA),
});
export type RestablecerPromptIADto = z.infer<typeof restablecerPromptIADto>;

/** Una funcionalidad de IA con su explicación, su texto de fábrica y el propio. */
export const promptIADto = z.object({
  clave: z.enum(CLAVES_PROMPT_IA),
  titulo: z.string(),
  donde: z.string(),
  audiencia: z.string(),
  descripcion: z.string(),
  variables: z.array(z.object({ nombre: z.string(), descripcion: z.string() })),
  porDefecto: z.string(),
  /** Lo que escribió el consultorio, o null si nunca lo tocó. */
  personalizado: z.string().nullable(),
});
export type PromptIADto = z.infer<typeof promptIADto>;

import { z } from "zod";

/** DTOs de las credenciales de integración del profesional. */

/**
 * Guardar credenciales. Cada campo es opcional: si no se envía, se deja como
 * está; string vacío la borra; un valor la setea (los secretos se cifran).
 */
export const PROVEEDORES_IA = ["ANTHROPIC", "OPENROUTER"] as const;

/** Criterios de ingredientes: filtran los alimentos que trae la búsqueda. */
export const criteriosIngredientesDto = z.object({
  excluirMarcas: z.boolean(),
  requiereMacros: z.boolean(),
  maxCaloriasPor100: z.number().min(0).max(2000).nullable(),
  excluirTexto: z.array(z.string().max(60)).max(20),
});
export type CriteriosIngredientesDto = z.infer<typeof criteriosIngredientesDto>;

export const guardarCredencialesDto = z.object({
  proveedorIA: z.enum(PROVEEDORES_IA).optional(),
  anthropicApiKey: z.string().max(300).optional(),
  anthropicModelo: z.string().max(120).optional(),
  fatsecretClientId: z.string().max(300).optional(),
  fatsecretClientSecret: z.string().max(300).optional(),
  criterios: criteriosIngredientesDto.optional(),
});
export type GuardarCredencialesDto = z.infer<typeof guardarCredencialesDto>;

/** Estado (nunca devuelve los secretos, solo si están configurados). */
export const estadoCredencialesDto = z.object({
  proveedorIA: z.enum(PROVEEDORES_IA),
  anthropicConfigurado: z.boolean(),
  anthropicModelo: z.string().nullable(),
  fatsecretConfigurado: z.boolean(),
  criterios: criteriosIngredientesDto,
});
export type EstadoCredencialesDto = z.infer<typeof estadoCredencialesDto>;

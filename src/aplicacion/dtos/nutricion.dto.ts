import { z } from "zod";
import { CATEGORIAS_ALIMENTO } from "@/dominio/entidades/AlimentoPropio";

/** DTOs de la búsqueda de datos nutricionales de ingredientes. */

/**
 * Con categoría, el término puede venir vacío: es «mostrame los lácteos»
 * (migración 84). Sin categoría hacen falta al menos 2 caracteres.
 */
export const buscarAlimentoDto = z
  .object({
    termino: z.string().max(120),
    limite: z.number().int().min(1).max(40).optional(),
    categoria: z.enum(CATEGORIAS_ALIMENTO).optional(),
  })
  .refine((d) => d.categoria || d.termino.trim().length >= 2, {
    message: "Escribí al menos 2 caracteres",
    path: ["termino"],
  });
export type BuscarAlimentoDto = z.infer<typeof buscarAlimentoDto>;

export const alimentoNutricionalSalidaDto = z.object({
  nombre: z.string(),
  marca: z.string().nullable(),
  referenciaExterna: z.string().nullable(),
  fuente: z.string(),
  caloriasPor100: z.number().nullable(),
  proteinasPor100: z.number().nullable(),
  carbohidratosPor100: z.number().nullable(),
  grasasPor100: z.number().nullable(),
  id: z.string().nullable(),
  categoria: z.enum(CATEGORIAS_ALIMENTO).nullable(),
  imagenVersion: z.string().nullable(),
});
export type AlimentoNutricionalSalidaDto = z.infer<
  typeof alimentoNutricionalSalidaDto
>;

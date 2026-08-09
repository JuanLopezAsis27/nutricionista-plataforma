import { z } from "zod";

/** DTOs de la búsqueda de datos nutricionales de ingredientes. */

export const buscarAlimentoDto = z.object({
  termino: z.string().min(2, "Escribí al menos 2 caracteres").max(120),
  limite: z.number().int().min(1).max(25).optional(),
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
});
export type AlimentoNutricionalSalidaDto = z.infer<typeof alimentoNutricionalSalidaDto>;

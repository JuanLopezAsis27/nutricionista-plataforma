import { z } from "zod";

/** DTOs de los alimentos propios del nutricionista (Excel de macros). */

const macro = z.number().min(0).max(2000).nullable().optional();

/** Una fila de la planilla, ya parseada. */
export const filaAlimentoPropioDto = z.object({
  nombre: z.string().max(200),
  marca: z.string().max(120).nullable().optional(),
  caloriasPor100: macro,
  proteinasPor100: macro,
  carbohidratosPor100: macro,
  grasasPor100: macro,
});
export type FilaAlimentoPropioDto = z.infer<typeof filaAlimentoPropioDto>;

export const importarAlimentosDto = z.array(filaAlimentoPropioDto).max(20000);
export type ImportarAlimentosDto = z.infer<typeof importarAlimentosDto>;

/** Estado de la lista (para la UI). */
export const estadoAlimentosPropiosDto = z.object({
  cantidad: z.number().int(),
  activo: z.boolean(),
});
export type EstadoAlimentosPropiosDto = z.infer<typeof estadoAlimentosPropiosDto>;

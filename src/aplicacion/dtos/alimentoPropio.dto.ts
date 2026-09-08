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
export type EstadoAlimentosPropiosDto = z.infer<
  typeof estadoAlimentosPropiosDto
>;

// --- Gestión manual (alta/edición/baja de un alimento y listado) ------------

export const crearAlimentoPropioDto = z.object({
  nombre: z.string().min(1, "Indicá el nombre").max(200),
  marca: z.string().max(120).nullable().optional(),
  caloriasPor100: macro,
  proteinasPor100: macro,
  carbohidratosPor100: macro,
  grasasPor100: macro,
});
export type CrearAlimentoPropioDto = z.infer<typeof crearAlimentoPropioDto>;

export const actualizarAlimentoPropioDto = z.intersection(
  crearAlimentoPropioDto.partial(),
  z.object({ id: z.string().min(1) }),
);
export type ActualizarAlimentoPropioDto = z.infer<
  typeof actualizarAlimentoPropioDto
>;

export const idAlimentoPropioDto = z.object({ id: z.string().min(1) });

export const listarAlimentosPropiosDto = z.object({
  busqueda: z.string().optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(20),
});
export type ListarAlimentosPropiosDto = z.infer<
  typeof listarAlimentosPropiosDto
>;

export const alimentoPropioSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  marca: z.string().nullable(),
  caloriasPor100: z.number().nullable(),
  proteinasPor100: z.number().nullable(),
  carbohidratosPor100: z.number().nullable(),
  grasasPor100: z.number().nullable(),
});
export type AlimentoPropioSalidaDto = z.infer<typeof alimentoPropioSalidaDto>;

/** Resultado paginado de la gestión manual. */
export interface AlimentosPropiosPaginados {
  alimentos: AlimentoPropioSalidaDto[];
  total: number;
  paginas: number;
}

import { z } from "zod";
import { DIAS_SEMANA } from "@/dominio/entidades/PlanSemanal";
import { ESTADOS_META } from "@/dominio/servicios/comparacionMacros";

/** DTOs de Plan Semanal — esquemas Zod de entrada/salida. */

const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm")
  .or(z.literal("").transform(() => null))
  .optional()
  .nullable();

const macroPor100 = z.number().min(0).max(10000).optional().nullable();

export const itemComidaSemanalDto = z.object({
  nombre: z.string().min(1, "El alimento necesita un nombre").max(160),
  cantidadGramos: z.number().min(0).max(100000).optional().nullable(),
  caloriasPor100: macroPor100,
  proteinasPor100: macroPor100,
  carbohidratosPor100: macroPor100,
  grasasPor100: macroPor100,
  /** De dónde salieron los macros: "OFF", "FATSECRET", "PROPIO", "MANUAL". */
  fuente: z.string().max(40).optional().nullable(),
  referenciaExterna: z.string().max(200).optional().nullable(),
});

export const comidaSemanalDto = z.object({
  dia: z.enum(DIAS_SEMANA),
  descripcion: z.string().max(2000).optional().nullable(),
  recetaId: z.string().min(1).optional().nullable(),
  /** Porciones de la receta vinculada. Solo tiene sentido con `recetaId`. */
  porciones: z.number().positive().max(100).optional().nullable(),
  items: z.array(itemComidaSemanalDto).max(40).optional(),
});

export const franjaSemanalDto = z.object({
  nombre: z.string().min(1, "La franja necesita un nombre").max(80),
  horaDesde: hora,
  horaHasta: hora,
  /**
   * Las comidas de la franja en toda la semana. Siete días × alternativas: el
   * tope alcanza para diez opciones por día, que es más de lo que nadie carga.
   */
  comidas: z.array(comidaSemanalDto).max(70).optional(),
});

const planSemanalBase = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(2000).optional().nullable(),
  franjas: z
    .array(franjaSemanalDto)
    .min(1, "Agregá al menos una franja")
    .max(12),
});

export const crearPlanSemanalDto = planSemanalBase;
export type CrearPlanSemanalDto = z.infer<typeof crearPlanSemanalDto>;

export const actualizarPlanSemanalDto = planSemanalBase.extend({
  id: z.string().min(1),
});
export type ActualizarPlanSemanalDto = z.infer<typeof actualizarPlanSemanalDto>;

export const idPlanSemanalDto = z.object({ id: z.string().min(1) });
export type IdPlanSemanalDto = z.infer<typeof idPlanSemanalDto>;

/** Listado paginado (10 por página por defecto). */
export const listarPlanesSemanalesDto = z.object({
  texto: z.string().max(160).optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(10),
});
export type ListarPlanesSemanalesDto = z.infer<typeof listarPlanesSemanalesDto>;

export const asignarPlanSemanalDto = z
  .object({
    planSemanalId: z.string().min(1),
    pacienteId: z.string().min(1),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date().optional().nullable(),
  })
  .refine((datos) => !datos.fechaFin || datos.fechaFin >= datos.fechaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["fechaFin"],
  });
export type AsignarPlanSemanalDto = z.infer<typeof asignarPlanSemanalDto>;

// --- Salida ------------------------------------------------------------------

const macrosDto = z.object({
  calorias: z.number().nullable(),
  proteinasG: z.number().nullable(),
  carbohidratosG: z.number().nullable(),
  grasasG: z.number().nullable(),
});
export type MacrosDto = z.infer<typeof macrosDto>;

const itemSalida = z.object({
  id: z.string(),
  nombre: z.string(),
  cantidadGramos: z.number().nullable(),
  caloriasPor100: z.number().nullable(),
  proteinasPor100: z.number().nullable(),
  carbohidratosPor100: z.number().nullable(),
  grasasPor100: z.number().nullable(),
  fuente: z.string().nullable(),
  referenciaExterna: z.string().nullable(),
  orden: z.number(),
});

const comidaSalida = z.object({
  id: z.string(),
  dia: z.enum(DIAS_SEMANA),
  /** 0 es la principal; 1, 2… son sus alternativas para ese día y franja. */
  orden: z.number(),
  descripcion: z.string().nullable(),
  recetaId: z.string().nullable(),
  recetaNombre: z.string().nullable(),
  /** Macros POR PORCIÓN de la receta vinculada. */
  recetaMacros: macrosDto.nullable(),
  porciones: z.number().nullable(),
  items: z.array(itemSalida),
  /**
   * Macros de la comida completa (alimentos + receta por sus porciones), ya
   * resueltos. La pantalla no los recalcula: es la misma razón por la que el
   * plan expone el archivo principal resuelto y no la lista cruda.
   */
  macros: macrosDto,
});

const franjaSalida = z.object({
  id: z.string(),
  nombre: z.string(),
  horaDesde: z.string().nullable(),
  horaHasta: z.string().nullable(),
  orden: z.number(),
  comidas: z.array(comidaSalida),
});

export const planSemanalSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  franjas: z.array(franjaSalida),
  /**
   * Lo que suma cada día con la comida PRINCIPAL de cada franja. Vienen los
   * siete días siempre, también los vacíos.
   */
  totalesPorDia: z.array(
    z.object({ dia: z.enum(DIAS_SEMANA), macros: macrosDto }),
  ),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type PlanSemanalSalidaDto = z.infer<typeof planSemanalSalidaDto>;

/** Resultado paginado del listado. */
export interface PlanesSemanalesPaginados {
  planes: PlanSemanalSalidaDto[];
  total: number;
  paginas: number;
}

const comparacionMacroDto = z.object({
  valor: z.number().nullable(),
  meta: z.number().nullable(),
  diferencia: z.number().nullable(),
  estado: z.enum(ESTADOS_META),
});

const diaComparadoDto = z.object({
  dia: z.enum(DIAS_SEMANA),
  macros: macrosDto,
  comparacion: z.object({
    calorias: comparacionMacroDto,
    proteinasG: comparacionMacroDto,
    carbohidratosG: comparacionMacroDto,
    grasasG: comparacionMacroDto,
  }),
});
export type DiaComparadoDto = z.infer<typeof diaComparadoDto>;

/**
 * El plan semanal del paciente, ya comparado contra sus metas diarias.
 *
 * Las metas NO son del plan semanal: salen del `PlanNutricional` que el
 * paciente tiene asignado, y por eso viaja también su nombre —la pantalla
 * tiene que poder decir de dónde salió el número contra el que compara—.
 * `metas` en null significa que el paciente no tiene plan activo o que ese
 * plan no declara metas: ahí se muestran totales sin semáforo.
 */
export const planSemanalDelPacienteDto = z.object({
  plan: planSemanalSalidaDto,
  metas: macrosDto.nullable(),
  nombrePlanDeLasMetas: z.string().nullable(),
  dias: z.array(diaComparadoDto),
});
export type PlanSemanalDelPacienteDto = z.infer<
  typeof planSemanalDelPacienteDto
>;

/**
 * Una asignación del historial. `planSemanalId` en null significa que el plan
 * se borró: la asignación sobrevive porque qué menú siguió el paciente y entre
 * qué fechas es información suya.
 */
export const asignacionPlanSemanalSalidaDto = z.object({
  id: z.string(),
  planSemanalId: z.string().nullable(),
  nombrePlan: z.string(),
  pacienteId: z.string(),
  fechaInicio: z.date(),
  fechaFin: z.date().nullable(),
  finalizadaEn: z.date().nullable(),
  activa: z.boolean(),
});
export type AsignacionPlanSemanalSalidaDto = z.infer<
  typeof asignacionPlanSemanalSalidaDto
>;

export const asignacionSemanalConPacienteDto =
  asignacionPlanSemanalSalidaDto.extend({
    pacienteNombre: z.string(),
    pacienteApellido: z.string(),
  });
export type AsignacionSemanalConPacienteDto = z.infer<
  typeof asignacionSemanalConPacienteDto
>;

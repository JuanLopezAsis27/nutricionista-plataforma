import { z } from "zod";
import {
  DIAS_SEMANA,
  MODOS_METAS_SEMANA,
} from "@/dominio/entidades/PlanSemanal";
import {
  ESTADOS_META,
  TIPOS_META,
} from "@/dominio/servicios/comparacionMacros";
import {
  cantidadAlimentoEntradaDto,
  cantidadAlimentoSalidaDto,
} from "./medidasAlimento.dto";

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
  /**
   * De dónde salieron los macros: "OFF", "PROPIO", "MANUAL".
   *
   * Las filas viejas pueden traer "FATSECRET": esa integración se eliminó, pero
   * el valor sigue existiendo en los planes ya guardados y no se reescribe.
   */
  fuente: z.string().max(40).optional().nullable(),
  referenciaExterna: z.string().max(200).optional().nullable(),
  /** Alimento de la lista del que se copió (migración 85). */
  alimentoOrigenId: z.string().max(64).nullable().optional(),
  ...cantidadAlimentoEntradaDto,
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

/** Cómo se lee cada meta: aproximada, piso o techo. Uno por macro. */
const tiposMetaDto = z.object({
  calorias: z.enum(TIPOS_META),
  proteinasG: z.enum(TIPOS_META),
  carbohidratosG: z.enum(TIPOS_META),
  grasasG: z.enum(TIPOS_META),
});

/** Los cuatro valores de una meta diaria; los topes son los del plan nutricional. */
const valoresMetaDto = z.object({
  calorias: z.number().int().min(0).max(100000).optional().nullable(),
  proteinasG: z.number().min(0).max(10000).optional().nullable(),
  carbohidratosG: z.number().min(0).max(10000).optional().nullable(),
  grasasG: z.number().min(0).max(10000).optional().nullable(),
});

/**
 * Las metas propias del plan semanal (migración 91): `general` con
 * `GENERAL` (las mismas los siete días), `porDia` con `POR_DIA`. La que no
 * corresponde al modo se descarta.
 */
export const metasPlanSemanalDto = z.object({
  modo: z.enum(MODOS_METAS_SEMANA),
  tipos: tiposMetaDto.partial().optional(),
  general: valoresMetaDto.nullable().optional(),
  porDia: z
    .array(valoresMetaDto.extend({ dia: z.enum(DIAS_SEMANA) }))
    .max(7)
    .optional(),
});
export type MetasPlanSemanalDto = z.infer<typeof metasPlanSemanalDto>;

const planSemanalBase = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(2000).optional().nullable(),
  /** Sin metas si no viene (y al editar, se borran: se manda el plan entero). */
  metas: metasPlanSemanalDto.nullable().optional(),
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
  ...cantidadAlimentoSalidaDto,
  caloriasPor100: z.number().nullable(),
  proteinasPor100: z.number().nullable(),
  carbohidratosPor100: z.number().nullable(),
  grasasPor100: z.number().nullable(),
  fuente: z.string().nullable(),
  referenciaExterna: z.string().nullable(),
  alimentoOrigenId: z.string().nullable(),
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

const comparacionMacroDto = z.object({
  valor: z.number().nullable(),
  meta: z.number().nullable(),
  diferencia: z.number().nullable(),
  estado: z.enum(ESTADOS_META),
  /** Cómo se leyó la meta: aproximada, piso o techo. */
  tipo: z.enum(TIPOS_META),
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

/** Las metas del plan, como las ve la pantalla. */
const metasPlanSemanalSalidaDto = z.object({
  modo: z.enum(MODOS_METAS_SEMANA),
  tipos: tiposMetaDto,
  /** Con GENERAL: las de todos los días, o null si el plan no tiene metas. */
  general: macrosDto.nullable(),
  /** Con POR_DIA: solo los días que tienen metas, en el orden de la semana. */
  porDia: z.array(macrosDto.extend({ dia: z.enum(DIAS_SEMANA) })),
});
export type MetasPlanSemanalSalidaDto = z.infer<
  typeof metasPlanSemanalSalidaDto
>;

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
  /** Sus metas propias (migración 91). */
  metas: metasPlanSemanalSalidaDto,
  /**
   * Cada día comparado contra SU meta, ya resuelto por el dominio
   * (`PlanSemanal.comparacionPorDia`). Los siete días siempre; sin metas,
   * todos en `SIN_META`.
   */
  dias: z.array(diaComparadoDto),
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

/**
 * El plan semanal vigente del paciente. Las metas y la comparación de cada
 * día viajan DENTRO del plan (`plan.metas`, `plan.dias`): desde la migración
 * 91 son del plan semanal y no de un plan nutricional asignado.
 */
export const planSemanalDelPacienteDto = z.object({
  plan: planSemanalSalidaDto,
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

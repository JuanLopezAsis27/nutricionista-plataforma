import { z } from "zod";
import {
  TIPOS_PLANIFICACION,
  MODALIDADES_CARRERA,
  MINUTOS_MAXIMOS_ANTES_DE_LARGAR,
  DURACION_MAXIMA_CARRERA_MIN,
  DISTANCIA_MAXIMA_CARRERA_KM,
  MAXIMO_INGESTAS,
  MAXIMO_ALIMENTOS_POR_INGESTA,
  PESO_MINIMO_KG,
  PESO_MAXIMO_KG,
} from "@/dominio/entidades/PlanificacionDeportiva";
import {
  cantidadAlimentoEntradaDto,
  cantidadAlimentoSalidaDto,
} from "./medidasAlimento.dto";

/** DTOs de la planificación deportiva (migración 94). */

const textoOpcional = (maximo: number) =>
  z.string().max(maximo).optional().nullable();
const macroPor100 = z.number().min(0).max(10000).optional().nullable();
const id = z.string().min(1).max(64);

// --- Entrada -----------------------------------------------------------------

export const alimentoIngestaDto = z.object({
  nombre: z.string().min(1, "El alimento necesita un nombre").max(160),
  cantidadGramos: z.number().min(0).max(100000).optional().nullable(),
  caloriasPor100: macroPor100,
  proteinasPor100: macroPor100,
  carbohidratosPor100: macroPor100,
  grasasPor100: macroPor100,
  /** mg por 100 g/ml, copiados del alimento (migración 96). */
  cafeinaPor100: z.number().min(0).max(99999).optional().nullable(),
  fuente: z.string().max(40).optional().nullable(),
  referenciaExterna: z.string().max(200).optional().nullable(),
  alimentoOrigenId: z.string().max(64).nullable().optional(),
  ...cantidadAlimentoEntradaDto,
});

export const ingestaDto = z.object({
  /** Minutos desde la largada; negativo = antes de largar. */
  minuto: z
    .number()
    .int()
    .min(-MINUTOS_MAXIMOS_ANTES_DE_LARGAR)
    .max(DURACION_MAXIMA_CARRERA_MIN),
  km: z.number().min(0).max(DISTANCIA_MAXIMA_CARRERA_KM).optional().nullable(),
  notas: textoOpcional(500),
  alimentos: z
    .array(alimentoIngestaDto)
    .max(MAXIMO_ALIMENTOS_POR_INGESTA)
    .optional(),
});

export const carreraDto = z.object({
  modalidad: z.enum(MODALIDADES_CARRERA),
  distanciaKm: z.number().positive().max(DISTANCIA_MAXIMA_CARRERA_KM),
  duracionEstimadaMin: z
    .number()
    .int()
    .positive()
    .max(DURACION_MAXIMA_CARRERA_MIN),
  desnivelPositivoM: z.number().int().min(0).max(20000).optional().nullable(),
  desnivelNegativoM: z.number().int().min(0).max(20000).optional().nullable(),
  horaLargada: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm")
    .optional()
    .nullable(),
  temperaturaEstimadaC: z.number().min(-40).max(60).optional().nullable(),
  carbohidratosObjetivoGH: z.number().min(0).max(300).optional().nullable(),
  liquidosObjetivoMlH: z.number().int().min(0).max(3000).optional().nullable(),
  sodioObjetivoMgH: z.number().int().min(0).max(5000).optional().nullable(),
  puestosAbastecimiento: textoOpcional(2000),
  estrategiaPrevia: textoOpcional(4000),
  recuperacion: textoOpcional(4000),
});

const contenidoPlanificacion = {
  nombre: z.string().trim().min(1, "Indicá el nombre").max(120),
  descripcion: textoOpcional(4000),
  /** Peso del deportista para la cafeína en mg/kg (migración 96). */
  pesoReferenciaKg: z
    .number()
    .min(PESO_MINIMO_KG)
    .max(PESO_MAXIMO_KG)
    .optional()
    .nullable(),
  carrera: carreraDto.optional().nullable(),
  ingestas: z.array(ingestaDto).max(MAXIMO_INGESTAS).optional(),
};

export const crearPlanificacionDto = z.object({
  ...contenidoPlanificacion,
  tipo: z.enum(TIPOS_PLANIFICACION),
  grupoId: id.optional().nullable(),
});
export type CrearPlanificacionDto = z.infer<typeof crearPlanificacionDto>;

/** Desde la ficha: va a la carpeta del paciente y queda asignada. */
export const crearPlanificacionParaPacienteDto = z.object({
  ...contenidoPlanificacion,
  tipo: z.enum(TIPOS_PLANIFICACION),
  pacienteId: id,
  competenciaId: id.optional().nullable(),
});
export type CrearPlanificacionParaPacienteDto = z.infer<
  typeof crearPlanificacionParaPacienteDto
>;

export const actualizarPlanificacionDto = z.object({
  ...contenidoPlanificacion,
  id,
  /**
   * Bloqueo optimista: el `actualizadoEn` de la planificación que se abrió.
   * Opcional, como en los planes.
   */
  actualizadoEn: z.coerce.date().optional(),
});
export type ActualizarPlanificacionDto = z.infer<
  typeof actualizarPlanificacionDto
>;

export const idPlanificacionDto = z.object({ id });

export const listarPlanificacionesDto = z.object({
  texto: z.string().max(120).optional(),
  /** Ausente = todas; null = las sueltas; un id = las de esa carpeta. */
  grupoId: id.nullable().optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(20),
});
export type ListarPlanificacionesDto = z.infer<typeof listarPlanificacionesDto>;

export const moverPlanificacionDto = z.object({
  planificacionId: id,
  grupoId: id.nullable(),
});

export const asignarPlanificacionDto = z.object({
  planificacionId: id,
  pacienteId: id,
  competenciaId: id.optional().nullable(),
});
export type AsignarPlanificacionDto = z.infer<typeof asignarPlanificacionDto>;

export const desasignarPlanificacionDto = z.object({
  planificacionId: id,
  pacienteId: id,
});

export const idPacientePlanificacionDto = z.object({ pacienteId: id });

// --- Salida ------------------------------------------------------------------

const macrosSalidaDto = z.object({
  calorias: z.number().nullable(),
  proteinasG: z.number().nullable(),
  carbohidratosG: z.number().nullable(),
  grasasG: z.number().nullable(),
});

const estadoObjetivoDto = z.enum(["DEBAJO", "CUMPLE", "ENCIMA"]).nullable();

export const alimentoIngestaSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  cantidadGramos: z.number().nullable(),
  caloriasPor100: z.number().nullable(),
  proteinasPor100: z.number().nullable(),
  carbohidratosPor100: z.number().nullable(),
  grasasPor100: z.number().nullable(),
  cafeinaPor100: z.number().nullable(),
  fuente: z.string().nullable(),
  referenciaExterna: z.string().nullable(),
  alimentoOrigenId: z.string().nullable(),
  ...cantidadAlimentoSalidaDto,
});

export const ingestaSalidaDto = z.object({
  id: z.string(),
  minuto: z.number(),
  /** «1:35» de carrera; «-0:30» antes de largar. */
  tiempo: z.string(),
  /** La hora del día con la hora de largada, o null. */
  hora: z.string().nullable(),
  km: z.number().nullable(),
  /** Solo en calle y sin km cargado: el km a ritmo parejo. */
  kmEstimado: z.number().nullable(),
  notas: z.string().nullable(),
  alimentos: z.array(alimentoIngestaSalidaDto),
  macros: macrosSalidaDto,
  liquidosMl: z.number().nullable(),
  /** mg de cafeína de la ingesta; null si ningún alimento trae el dato. */
  cafeinaMg: z.number().nullable(),
});

export const carreraSalidaDto = z.object({
  modalidad: z.enum(MODALIDADES_CARRERA),
  distanciaKm: z.number(),
  duracionEstimadaMin: z.number(),
  desnivelPositivoM: z.number().nullable(),
  desnivelNegativoM: z.number().nullable(),
  horaLargada: z.string().nullable(),
  temperaturaEstimadaC: z.number().nullable(),
  carbohidratosObjetivoGH: z.number().nullable(),
  liquidosObjetivoMlH: z.number().nullable(),
  sodioObjetivoMgH: z.number().nullable(),
  puestosAbastecimiento: z.string().nullable(),
  estrategiaPrevia: z.string().nullable(),
  recuperacion: z.string().nullable(),
  /** Minutos por km a la duración estimada. */
  ritmoMinPorKm: z.number().nullable(),
});

export const resumenIngestasSalidaDto = z.object({
  durante: z.object({
    cantidad: z.number(),
    macros: macrosSalidaDto,
    liquidosMl: z.number().nullable(),
    porHora: z.object({
      calorias: z.number().nullable(),
      carbohidratosG: z.number().nullable(),
      liquidosMl: z.number().nullable(),
    }),
  }),
  antes: z.object({
    cantidad: z.number(),
    macros: macrosSalidaDto,
    liquidosMl: z.number().nullable(),
  }),
  carbohidratos: estadoObjetivoDto,
  liquidos: estadoObjetivoDto,
  intervaloMaximoMin: z.number().nullable(),
  cafeina: z.object({
    antesMg: z.number().nullable(),
    duranteMg: z.number().nullable(),
    totalMg: z.number().nullable(),
    porHoraMg: z.number().nullable(),
    mgPorKg: z.number().nullable(),
  }),
});

export const planificacionSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  tipo: z.enum(TIPOS_PLANIFICACION),
  grupoId: z.string().nullable(),
  pesoReferenciaKg: z.number().nullable(),
  carrera: carreraSalidaDto.nullable(),
  ingestas: z.array(ingestaSalidaDto),
  resumen: resumenIngestasSalidaDto,
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type PlanificacionSalidaDto = z.infer<typeof planificacionSalidaDto>;
export type IngestaSalidaDto = z.infer<typeof ingestaSalidaDto>;

/** Fila del listado: lo justo para la tabla (sin ingestas). */
export interface PlanificacionListadaDto {
  id: string;
  nombre: string;
  tipo: PlanificacionSalidaDto["tipo"];
  grupoId: string | null;
  modalidad: z.infer<typeof carreraSalidaDto>["modalidad"] | null;
  distanciaKm: number | null;
  duracionEstimadaMin: number | null;
  cantidadIngestas: number;
  cantidadPacientes: number;
  actualizadoEn: Date;
}

export interface PlanificacionesPaginadasDto {
  items: PlanificacionListadaDto[];
  total: number;
  paginas: number;
}

export const competenciaDeAsignacionSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  fecha: z.date(),
  lugar: z.string().nullable(),
});
export type CompetenciaDeAsignacionSalidaDto = z.infer<
  typeof competenciaDeAsignacionSalidaDto
>;

/** Una planificación de un paciente, con la competencia para la que es. */
export interface PlanificacionDelPacienteDto {
  asignadaEn: Date;
  competencia: CompetenciaDeAsignacionSalidaDto | null;
  planificacion: PlanificacionSalidaDto;
}

/** Quién tiene una planificación. */
export interface PacienteDePlanificacionDto {
  pacienteId: string;
  nombre: string;
  apellido: string;
  asignadaEn: Date;
  competencia: CompetenciaDeAsignacionSalidaDto | null;
}

/** Una carpeta de planificaciones, con cuántas tiene. */
export interface GrupoPlanificacionSalidaDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  pacienteId: string | null;
  cantidadPlanificaciones: number;
}

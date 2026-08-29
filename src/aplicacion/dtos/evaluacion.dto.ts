import { z } from "zod";
import {
  TIPOS_ALERTA_ALIMENTARIA,
  SEVERIDADES_ALERTA,
} from "@/dominio/entidades/AlertaAlimentaria";
import { NIVELES_ACTIVIDAD } from "@/dominio/servicios/composicionCorporal";
import { PROTOCOLOS_COMPOSICION } from "@/dominio/entidades/Antropometria";
import { CAMPOS_PLANTILLA } from "@/dominio/entidades/PlantillaAntropometrica";
import type {
  AlcancePlantilla,
  CampoPlantilla,
} from "@/dominio/entidades/PlantillaAntropometrica";
import type { ProtocoloComposicion } from "@/dominio/entidades/Antropometria";
import type {
  ResultadoComposicion,
  SexoBiologico,
  NivelActividad,
} from "@/dominio/servicios/composicionCorporal";
import { VARIABLES_COMPOSICION } from "@/dominio/entidades/ObjetivoComposicion";
import type { VariableComposicion } from "@/dominio/entidades/ObjetivoComposicion";
import { METODOS_GRASA } from "@/dominio/servicios/grasaPorPliegues";
import type {
  MetodoGrasa,
  ProyeccionPliegues,
} from "@/dominio/servicios/grasaPorPliegues";
import { ESTADOS_OBJETIVO } from "@/dominio/entidades/Objetivo";
import type { EstadoObjetivo } from "@/dominio/entidades/Objetivo";
import type { ProyeccionObjetivo } from "@/dominio/servicios/proyeccionComposicion";

/** DTOs de Evaluación Integral — esquemas Zod de entrada/salida. */

// --- Historia clínica ---------------------------------------------------------

const campoTextoLargo = z.string().max(5000).optional().nullable();

export const guardarHistoriaClinicaDto = z.object({
  pacienteId: z.string().min(1),
  motivoConsulta: campoTextoLargo,
  diagnosticos: campoTextoLargo,
  medicacion: campoTextoLargo,
  antecedentesPersonales: campoTextoLargo,
  antecedentesFamiliares: campoTextoLargo,
  habitos: campoTextoLargo,
  contexto: campoTextoLargo,
});
export type GuardarHistoriaClinicaDto = z.infer<
  typeof guardarHistoriaClinicaDto
>;

export const historiaClinicaSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  motivoConsulta: z.string().nullable(),
  diagnosticos: z.string().nullable(),
  medicacion: z.string().nullable(),
  antecedentesPersonales: z.string().nullable(),
  antecedentesFamiliares: z.string().nullable(),
  habitos: z.string().nullable(),
  contexto: z.string().nullable(),
  actualizadoEn: z.date(),
});
export type HistoriaClinicaSalidaDto = z.infer<typeof historiaClinicaSalidaDto>;

// --- Antropometría ------------------------------------------------------------

const pliegue = z.number().min(1).max(80).optional().nullable();
const circunferencia = z.number().min(20).max(250).optional().nullable();
const diametro = z.number().min(2).max(60).optional().nullable();

export const medidasAntropometricasDto = z.object({
  pesoKg: z.number().min(20).max(400),
  tallaCm: z.number().min(100).max(250).optional().nullable(),
  tallaSentadoCm: z.number().min(50).max(150).optional().nullable(),
  nivelActividad: z.enum(NIVELES_ACTIVIDAD).optional().nullable(),
  protocolo: z.enum(PROTOCOLOS_COMPOSICION).optional(),
  metodoGrasa: z.enum(METODOS_GRASA).optional().nullable(),
  diamBiacromial: diametro,
  diamToraxTransverso: diametro,
  diamToraxAnteroposterior: diametro,
  diamBiiliocrestideo: diametro,
  diamHumeral: diametro,
  diamFemoral: diametro,
  pliegueTricipital: pliegue,
  pliegueSubescapular: pliegue,
  pliegueSupraespinal: pliegue,
  pliegueAbdominal: pliegue,
  pliegueMuslo: pliegue,
  plieguePantorrilla: pliegue,
  pliegueBicipital: pliegue,
  pliegueCrestaIliaca: pliegue,
  circTorax: circunferencia,
  circCinturaMinima: circunferencia,
  circCinturaMaxima: circunferencia,
  circCadera: circunferencia,
  circBrazo: circunferencia,
  circBrazoContraido: circunferencia,
  circCabeza: circunferencia,
  circAntebrazo: circunferencia,
  circMusloMaximo: circunferencia,
  circMusloMedial: circunferencia,
  circPantorrilla: circunferencia,
  kgGrasa: z.number().min(0).max(150).optional().nullable(),
  observaciones: z.string().max(2000).optional().nullable(),
});

export const registrarAntropometriaDto = medidasAntropometricasDto.extend({
  pacienteId: z.string().min(1),
  fecha: z.coerce.date(),
});
export type RegistrarAntropometriaDto = z.infer<
  typeof registrarAntropometriaDto
>;

export const actualizarAntropometriaDto = medidasAntropometricasDto
  .partial()
  .extend({
    id: z.string().min(1),
    fecha: z.coerce.date().optional(),
  });
export type ActualizarAntropometriaDto = z.infer<
  typeof actualizarAntropometriaDto
>;

export const idAntropometriaDto = z.object({ id: z.string().min(1) });

/** Medición + derivados de la planilla, para la vista de evolución. */
export interface MedicionEvolucionDto {
  id: string;
  pacienteId: string;
  fecha: Date;
  pesoKg: number;
  tallaCm: number | null;
  tallaSentadoCm: number | null;
  nivelActividad: NivelActividad | null;
  protocolo: ProtocoloComposicion;
  metodoGrasa: MetodoGrasa | null;
  diamBiacromial: number | null;
  diamToraxTransverso: number | null;
  diamToraxAnteroposterior: number | null;
  diamBiiliocrestideo: number | null;
  diamHumeral: number | null;
  diamFemoral: number | null;
  pliegueTricipital: number | null;
  pliegueSubescapular: number | null;
  pliegueSupraespinal: number | null;
  pliegueAbdominal: number | null;
  pliegueMuslo: number | null;
  plieguePantorrilla: number | null;
  pliegueBicipital: number | null;
  pliegueCrestaIliaca: number | null;
  circTorax: number | null;
  circCinturaMinima: number | null;
  circCinturaMaxima: number | null;
  circCadera: number | null;
  circBrazo: number | null;
  circBrazoContraido: number | null;
  circCabeza: number | null;
  circAntebrazo: number | null;
  circMusloMaximo: number | null;
  circMusloMedial: number | null;
  circPantorrilla: number | null;
  kgGrasa: number | null;
  observaciones: string | null;
  creadoEn: Date;
  // Derivados (calculados por el dominio, nunca persistidos)
  sumatoria6Pliegues: number | null;
  kgBajadosVsAnterior: number | null;
  kgBajadosAcumulados: number | null;
}

export interface EvolucionAntropometricaDto {
  mediciones: MedicionEvolucionDto[];
}

// --- Composición corporal -------------------------------------------------------

/**
 * Una medición con todo lo que el dominio derivó de ella. El `resultado` sale
 * tal cual del servicio de dominio: los tipos de `composicionCorporal` son
 * estructuras planas de números, seguras de cruzar la frontera de tRPC.
 */
export interface MedicionComposicionDto {
  id: string;
  fecha: Date;
  observaciones: string | null;
  nivelActividad: NivelActividad | null;
  protocolo: ProtocoloComposicion;
  /** Ecuación destacada; null = la primera que se pueda calcular. */
  metodoGrasa: MetodoGrasa | null;
  /** Edad del paciente el día de la medición. */
  edadAnios: number | null;
  medidas: MedicionEvolucionDto;
  resultado: ResultadoComposicion;
}

/** Meta de composición + su proyección contra la serie histórica. */
export interface ObjetivoComposicionDto {
  id: string;
  pacienteId: string;
  variable: VariableComposicion;
  /** Ecuación con la que se sigue la meta (solo en variables de grasa). */
  metodoGrasa: MetodoGrasa | null;
  /** Nombre de la meta ya compuesto: incluye la ecuación cuando la hay. */
  descripcion: string;
  valorObjetivo: number;
  fechaObjetivo: Date | null;
  estado: EstadoObjetivo;
  notas: string | null;
  creadoEn: Date;
  proyeccion: ProyeccionObjetivo;
  /** Pliegues proyectados para la meta; null si la variable no los define. */
  proyeccionPliegues: ProyeccionPliegues | null;
}

/** Valor que hoy tiene una variable objetivable (de la última medición). */
export interface ValorActualVariableDto {
  variable: VariableComposicion;
  metodoGrasa: MetodoGrasa | null;
  valor: number;
}

/** Todo lo que consume el dashboard de composición corporal. */
export interface ComposicionCorporalDto {
  sexo: SexoBiologico | null;
  fechaNacimiento: Date | null;
  mediciones: MedicionComposicionDto[];
  objetivos: ObjetivoComposicionDto[];
  /** Punto de partida para plantear metas nuevas, por variable y ecuación. */
  valoresActuales: ValorActualVariableDto[];
}

export const guardarObjetivoComposicionDto = z.object({
  pacienteId: z.string().min(1),
  variable: z.enum(VARIABLES_COMPOSICION),
  metodoGrasa: z.enum(METODOS_GRASA).optional().nullable(),
  valorObjetivo: z.number().finite(),
  fechaObjetivo: z.coerce.date().optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
  estado: z.enum(ESTADOS_OBJETIVO).optional(),
});
export type GuardarObjetivoComposicionDto = z.infer<
  typeof guardarObjetivoComposicionDto
>;

export const idObjetivoComposicionDto = z.object({ id: z.string().min(1) });

// --- Plantillas de carga --------------------------------------------------------

export const guardarPlantillaAntropometricaDto = z.object({
  id: z.string().min(1).optional(),
  nombre: z.string().min(1, "La plantilla necesita un nombre").max(80),
  descripcion: z.string().max(500).optional().nullable(),
  campos: z.array(z.enum(CAMPOS_PLANTILLA)).min(1, "Elegí al menos un campo"),
});
export type GuardarPlantillaAntropometricaDto = z.infer<
  typeof guardarPlantillaAntropometricaDto
>;

export const idPlantillaAntropometricaDto = z.object({ id: z.string().min(1) });

/** Plantilla + qué resultados habilita (lo calcula el dominio). */
export interface PlantillaAntropometricaDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  campos: CampoPlantilla[];
  alcance: AlcancePlantilla;
  creadoEn: Date;
}

// --- Alertas alimentarias -----------------------------------------------------

export const registrarAlertaAlimentariaDto = z.object({
  pacienteId: z.string().min(1),
  tipo: z.enum(TIPOS_ALERTA_ALIMENTARIA),
  descripcion: z.string().min(1, "Indicá el alimento o condición").max(200),
  severidad: z.enum(SEVERIDADES_ALERTA).optional(),
  notas: z.string().max(1000).optional().nullable(),
});
export type RegistrarAlertaAlimentariaDto = z.infer<
  typeof registrarAlertaAlimentariaDto
>;

export const actualizarAlertaAlimentariaDto = z.object({
  id: z.string().min(1),
  tipo: z.enum(TIPOS_ALERTA_ALIMENTARIA).optional(),
  descripcion: z.string().min(1).max(200).optional(),
  severidad: z.enum(SEVERIDADES_ALERTA).optional(),
  notas: z.string().max(1000).optional().nullable(),
});
export type ActualizarAlertaAlimentariaDto = z.infer<
  typeof actualizarAlertaAlimentariaDto
>;

export const alertaAlimentariaSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  tipo: z.enum(TIPOS_ALERTA_ALIMENTARIA),
  descripcion: z.string(),
  severidad: z.enum(SEVERIDADES_ALERTA),
  notas: z.string().nullable(),
  creadoEn: z.date(),
});
export type AlertaAlimentariaSalidaDto = z.infer<
  typeof alertaAlimentariaSalidaDto
>;

// --- Laboratorios ---------------------------------------------------------------

export const registrarLaboratorioDto = z.object({
  pacienteId: z.string().min(1),
  fecha: z.coerce.date(),
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  notas: z.string().max(2000).optional().nullable(),
  archivoIds: z.array(z.string().min(1)).default([]),
});
export type RegistrarLaboratorioDto = z.infer<typeof registrarLaboratorioDto>;

export const actualizarLaboratorioDto = z.object({
  id: z.string().min(1),
  fecha: z.coerce.date().optional(),
  titulo: z.string().min(1).max(200).optional(),
  notas: z.string().max(2000).optional().nullable(),
  archivoIdsNuevos: z.array(z.string().min(1)).default([]),
});
export type ActualizarLaboratorioDto = z.infer<typeof actualizarLaboratorioDto>;

export const adjuntoLaboratorioDto = z.object({
  id: z.string(),
  nombreOriginal: z.string(),
  mimeType: z.string(),
  tamanoBytes: z.number(),
});

export const laboratorioSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  fecha: z.date(),
  titulo: z.string(),
  notas: z.string().nullable(),
  adjuntos: z.array(adjuntoLaboratorioDto),
  creadoEn: z.date(),
});
export type LaboratorioSalidaDto = z.infer<typeof laboratorioSalidaDto>;

// --- Comunes --------------------------------------------------------------------

export const idPacienteEvaluacionDto = z.object({
  pacienteId: z.string().min(1),
});

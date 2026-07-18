import { z } from "zod";
import {
  TIPOS_ALERTA_ALIMENTARIA,
  SEVERIDADES_ALERTA,
} from "@/dominio/entidades/AlertaAlimentaria";

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
export type GuardarHistoriaClinicaDto = z.infer<typeof guardarHistoriaClinicaDto>;

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

export const medidasAntropometricasDto = z.object({
  pesoKg: z.number().min(20).max(400),
  tallaCm: z.number().min(100).max(250).optional().nullable(),
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
  kgGrasa: z.number().min(0).max(150).optional().nullable(),
  observaciones: z.string().max(2000).optional().nullable(),
});

export const registrarAntropometriaDto = medidasAntropometricasDto.extend({
  pacienteId: z.string().min(1),
  fecha: z.coerce.date(),
});
export type RegistrarAntropometriaDto = z.infer<typeof registrarAntropometriaDto>;

export const actualizarAntropometriaDto = medidasAntropometricasDto
  .partial()
  .extend({
    id: z.string().min(1),
    fecha: z.coerce.date().optional(),
  });
export type ActualizarAntropometriaDto = z.infer<typeof actualizarAntropometriaDto>;

export const idAntropometriaDto = z.object({ id: z.string().min(1) });

/** Medición + derivados de la planilla, para la vista de evolución. */
export interface MedicionEvolucionDto {
  id: string;
  pacienteId: string;
  fecha: Date;
  pesoKg: number;
  tallaCm: number | null;
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

// --- Alertas alimentarias -----------------------------------------------------

export const registrarAlertaAlimentariaDto = z.object({
  pacienteId: z.string().min(1),
  tipo: z.enum(TIPOS_ALERTA_ALIMENTARIA),
  descripcion: z.string().min(1, "Indicá el alimento o condición").max(200),
  severidad: z.enum(SEVERIDADES_ALERTA).optional(),
  notas: z.string().max(1000).optional().nullable(),
});
export type RegistrarAlertaAlimentariaDto = z.infer<typeof registrarAlertaAlimentariaDto>;

export const actualizarAlertaAlimentariaDto = z.object({
  id: z.string().min(1),
  tipo: z.enum(TIPOS_ALERTA_ALIMENTARIA).optional(),
  descripcion: z.string().min(1).max(200).optional(),
  severidad: z.enum(SEVERIDADES_ALERTA).optional(),
  notas: z.string().max(1000).optional().nullable(),
});
export type ActualizarAlertaAlimentariaDto = z.infer<typeof actualizarAlertaAlimentariaDto>;

export const alertaAlimentariaSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  tipo: z.enum(TIPOS_ALERTA_ALIMENTARIA),
  descripcion: z.string(),
  severidad: z.enum(SEVERIDADES_ALERTA),
  notas: z.string().nullable(),
  creadoEn: z.date(),
});
export type AlertaAlimentariaSalidaDto = z.infer<typeof alertaAlimentariaSalidaDto>;

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

export const idPacienteEvaluacionDto = z.object({ pacienteId: z.string().min(1) });

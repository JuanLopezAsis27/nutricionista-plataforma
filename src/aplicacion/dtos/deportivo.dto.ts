import { z } from "zod";
import {
  NIVELES_DEPORTIVOS,
  FASES_TEMPORADA,
} from "@/dominio/entidades/PerfilDeportivo";
import { IMPORTANCIAS_COMPETENCIA } from "@/dominio/entidades/Competencia";

/** DTOs del módulo deportivo (perfil del deportista + calendario de competencias). */

// --- Perfil deportivo ------------------------------------------------------
export const guardarPerfilDeportivoDto = z.object({
  pacienteId: z.string().min(1),
  deporte: z.string().min(1, "Indicá el deporte").max(80),
  disciplina: z.string().max(80).optional().nullable(),
  nivel: z.enum(NIVELES_DEPORTIVOS).optional(),
  fase: z.enum(FASES_TEMPORADA).optional(),
  diasEntrenamientoSemana: z
    .number()
    .int()
    .min(0)
    .max(14)
    .optional()
    .nullable(),
  horasSemana: z.number().min(0).max(80).optional().nullable(),
  pesoCategoriaKg: z.number().min(20).max(400).optional().nullable(),
  posicion: z.string().max(60).optional().nullable(),
  objetivo: z.string().max(500).optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
});
export type GuardarPerfilDeportivoDto = z.infer<
  typeof guardarPerfilDeportivoDto
>;

export const perfilDeportivoSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  deporte: z.string(),
  disciplina: z.string().nullable(),
  nivel: z.enum(NIVELES_DEPORTIVOS),
  fase: z.enum(FASES_TEMPORADA),
  diasEntrenamientoSemana: z.number().nullable(),
  horasSemana: z.number().nullable(),
  pesoCategoriaKg: z.number().nullable(),
  posicion: z.string().nullable(),
  objetivo: z.string().nullable(),
  notas: z.string().nullable(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type PerfilDeportivoSalidaDto = z.infer<typeof perfilDeportivoSalidaDto>;

// --- Competencias ----------------------------------------------------------
const competenciaBase = {
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  fecha: z.coerce.date(),
  lugar: z.string().max(160).optional().nullable(),
  objetivo: z.string().max(300).optional().nullable(),
  resultado: z.string().max(300).optional().nullable(),
  importancia: z.enum(IMPORTANCIAS_COMPETENCIA).optional(),
  notas: z.string().max(1000).optional().nullable(),
};

export const crearCompetenciaDto = z.object({
  pacienteId: z.string().min(1),
  ...competenciaBase,
});
export type CrearCompetenciaDto = z.infer<typeof crearCompetenciaDto>;

export const actualizarCompetenciaDto = z.object({
  id: z.string().min(1),
  ...competenciaBase,
});
export type ActualizarCompetenciaDto = z.infer<typeof actualizarCompetenciaDto>;

export const competenciaSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  nombre: z.string(),
  fecha: z.date(),
  lugar: z.string().nullable(),
  objetivo: z.string().nullable(),
  resultado: z.string().nullable(),
  importancia: z.enum(IMPORTANCIAS_COMPETENCIA),
  notas: z.string().nullable(),
  creadoEn: z.date(),
});
export type CompetenciaSalidaDto = z.infer<typeof competenciaSalidaDto>;

export const idPacienteDeportivoDto = z.object({
  pacienteId: z.string().min(1),
});
export const idCompetenciaDto = z.object({ id: z.string().min(1) });

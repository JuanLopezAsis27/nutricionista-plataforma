import { z } from "zod";
import {
  CALIDADES_SUENO,
  INTENSIDADES_ACTIVIDAD,
} from "@/dominio/entidades/RegistroDiario";

/** DTOs del Diario del paciente — esquemas Zod de entrada/salida. */

const horaHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)");

// Los procedimientos del portal NO reciben pacienteId (sale de la sesión);
// las variantes del nutricionista lo agregan explícitamente.

export const guardarDiaDto = z.object({
  fecha: z.coerce.date(),
  pesoKg: z.number().min(20).max(400).optional().nullable(),
  aguaMl: z.number().int().min(0).max(10000).optional().nullable(),
  horasSueno: z.number().min(0).max(24).optional().nullable(),
  calidadSueno: z.enum(CALIDADES_SUENO).optional().nullable(),
  notas: z.string().max(2000).optional().nullable(),
});
export type GuardarDiaDto = z.infer<typeof guardarDiaDto>;

export const fechaDiaDto = z.object({ fecha: z.coerce.date() });

export const agregarComidaDto = z.object({
  fecha: z.coerce.date(),
  franja: z.string().min(1, "Indicá la franja").max(50),
  hora: horaHHmm.optional().nullable(),
  descripcion: z.string().min(1, "Describí qué comiste").max(1000),
  porcion: z.string().max(120).optional().nullable(),
});
export type AgregarComidaDto = z.infer<typeof agregarComidaDto>;

export const agregarActividadDto = z.object({
  fecha: z.coerce.date(),
  tipo: z.string().min(1, "Indicá la actividad").max(100),
  duracionMinutos: z.number().int().min(1).max(1440),
  intensidad: z.enum(INTENSIDADES_ACTIVIDAD).optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
});
export type AgregarActividadDto = z.infer<typeof agregarActividadDto>;

export const idHijoDiarioDto = z.object({ id: z.string().min(1) });

export const agregarFotoComidaDto = z.object({
  comidaId: z.string().min(1),
  archivoId: z.string().min(1),
});

export const mesCalendarioDto = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

export const rangoDiarioDto = z.object({
  pacienteId: z.string().min(1),
  desde: z.coerce.date(),
  hasta: z.coerce.date(),
});

// --- Salidas --------------------------------------------------------------------

export const comidaConsumidaSalidaDto = z.object({
  id: z.string(),
  franja: z.string(),
  hora: z.string().nullable(),
  descripcion: z.string(),
  porcion: z.string().nullable(),
  fotoArchivoId: z.string().nullable(),
  creadoEn: z.date(),
});

export const actividadFisicaSalidaDto = z.object({
  id: z.string(),
  tipo: z.string(),
  duracionMinutos: z.number(),
  intensidad: z.enum(INTENSIDADES_ACTIVIDAD).nullable(),
  notas: z.string().nullable(),
  creadoEn: z.date(),
});

export const registroDiarioSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  fecha: z.date(),
  pesoKg: z.number().nullable(),
  aguaMl: z.number().nullable(),
  horasSueno: z.number().nullable(),
  calidadSueno: z.enum(CALIDADES_SUENO).nullable(),
  notas: z.string().nullable(),
  comidas: z.array(comidaConsumidaSalidaDto),
  actividades: z.array(actividadFisicaSalidaDto),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type RegistroDiarioSalidaDto = z.infer<typeof registroDiarioSalidaDto>;

/** Indicadores de un día para pintar el calendario mensual. */
export interface DiaCalendarioDto {
  fecha: Date;
  tienePeso: boolean;
  tieneAgua: boolean;
  tieneSueno: boolean;
  cantidadComidas: number;
  cantidadActividades: number;
}

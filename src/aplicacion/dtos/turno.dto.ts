import { z } from "zod";
import { ESTADOS_TURNO } from "@/dominio/entidades/Turno";

/** DTOs de Turno — esquemas Zod de entrada/salida. */

const horaHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm");

export const agendarTurnoDto = z.object({
  pacienteId: z.string().min(1),
  fecha: z.coerce.date(),
  hora: horaHHmm,
  duracionMinutos: z.number().int().positive().max(480).default(30),
  notas: z.string().max(1000).optional().nullable(),
});
export type AgendarTurnoDto = z.infer<typeof agendarTurnoDto>;

export const actualizarEstadoTurnoDto = z.object({
  id: z.string().min(1),
  estado: z.enum(ESTADOS_TURNO),
});
export type ActualizarEstadoTurnoDto = z.infer<typeof actualizarEstadoTurnoDto>;

export const cancelarTurnoDto = z.object({ id: z.string().min(1) });
export type CancelarTurnoDto = z.infer<typeof cancelarTurnoDto>;

export const reprogramarTurnoDto = z.object({
  id: z.string().min(1),
  fecha: z.coerce.date(),
  hora: horaHHmm,
  duracionMinutos: z.number().int().positive().max(480).default(30),
});
export type ReprogramarTurnoDto = z.infer<typeof reprogramarTurnoDto>;

export const listarTurnosDto = z.object({
  fecha: z.coerce.date().optional(),
  estado: z.enum(ESTADOS_TURNO).optional(),
  pacienteId: z.string().optional(),
});
export type ListarTurnosDto = z.infer<typeof listarTurnosDto>;

export const idPacienteTurnosDto = z.object({ pacienteId: z.string().min(1) });
export type IdPacienteTurnosDto = z.infer<typeof idPacienteTurnosDto>;

export const registrarCobroTurnoDto = z.object({
  id: z.string().min(1),
  precio: z.number().min(0).max(10_000_000).nullable(),
  pagado: z.boolean(),
});
export type RegistrarCobroTurnoDto = z.infer<typeof registrarCobroTurnoDto>;

export const turnoSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  fecha: z.date(),
  hora: z.string(),
  duracionMinutos: z.number(),
  estado: z.enum(ESTADOS_TURNO),
  notas: z.string().nullable(),
  precio: z.number().nullable(),
  pagado: z.boolean(),
  creadoEn: z.date(),
});
export type TurnoSalidaDto = z.infer<typeof turnoSalidaDto>;

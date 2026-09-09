import { z } from "zod";

/** DTOs de Establecimiento — los lugares donde el profesional atiende. */

const horaHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm");

const color = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color hexadecimal inválido");

/**
 * Campos de agenda, comunes al alta y a la edición.
 *
 * Son los que vivían en la configuración del consultorio hasta la migración
 * 49: describen al LUGAR, y con una sola copia no se podía decir "lunes y
 * miércoles en el centro, martes y jueves en el barrio".
 */
const agenda = {
  turnoDuracionMinutos: z.number().int().min(5).max(480).optional(),
  turnoPasoMinutos: z.number().int().min(5).max(480).optional(),
  atencionHoraDesde: horaHHmm.nullable().optional(),
  atencionHoraHasta: horaHHmm.nullable().optional(),
  diasAtencion: z.array(z.number().int().min(0).max(6)).max(7).optional(),
};

export const crearEstablecimientoDto = z.object({
  nombre: z.string().min(1).max(120),
  direccion: z.string().max(300).nullable().optional(),
  telefono: z.string().max(50).nullable().optional(),
  color: color.nullable().optional(),
  orden: z.number().int().min(0).max(999).optional(),
  ...agenda,
});
export type CrearEstablecimientoDto = z.infer<typeof crearEstablecimientoDto>;

export const actualizarEstablecimientoDto = crearEstablecimientoDto
  .partial()
  .extend({ id: z.string().min(1) });
export type ActualizarEstablecimientoDto = z.infer<
  typeof actualizarEstablecimientoDto
>;

export const idEstablecimientoDto = z.object({ id: z.string().min(1) });
export type IdEstablecimientoDto = z.infer<typeof idEstablecimientoDto>;

export const listarEstablecimientosDto = z.object({
  /** Las archivadas solo se piden para la pantalla de gestión. */
  incluirArchivados: z.boolean().optional(),
});
export type ListarEstablecimientosDto = z.infer<
  typeof listarEstablecimientosDto
>;

export const establecimientoSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  direccion: z.string().nullable(),
  telefono: z.string().nullable(),
  color: z.string().nullable(),
  orden: z.number(),
  esPrincipal: z.boolean(),
  turnoDuracionMinutos: z.number(),
  turnoPasoMinutos: z.number(),
  atencionHoraDesde: z.string().nullable(),
  atencionHoraHasta: z.string().nullable(),
  diasAtencion: z.array(z.number()),
  archivadoEn: z.date().nullable(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type EstablecimientoSalidaDto = z.infer<typeof establecimientoSalidaDto>;

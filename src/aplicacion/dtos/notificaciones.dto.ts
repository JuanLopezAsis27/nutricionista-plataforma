import { z } from "zod";

/** DTOs del Centro de Notificaciones (feed unificado del nutricionista). */

export const TIPOS_NOTIFICACION = [
  "ALERTA",
  "MENSAJE",
  "CORREO",
  "WHATSAPP",
  "TURNO",
] as const;

export const notificacionDto = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_NOTIFICACION),
  titulo: z.string(),
  detalle: z.string(),
  fecha: z.date(),
  enlace: z.string().nullable(),
  alertaId: z.string().nullable(),
  pacienteId: z.string().nullable(),
  noLeidos: z.number().nullable(),
  /** Id de la notificación persistida, para marcarla vista. */
  notificacionId: z.string().nullable(),
  /** Null en los tipos derivados, que no tienen estado de visto. */
  vista: z.boolean().nullable(),
});
export type NotificacionDto = z.infer<typeof notificacionDto>;

/**
 * Marcar como vista. Sin `id` se marcan TODAS las del consultorio, que es el
 * botón "marcar todas" de la campana.
 */
export const marcarNotificacionVistaDto = z.object({
  id: z.string().uuid().optional(),
});
export type MarcarNotificacionVistaDto = z.infer<
  typeof marcarNotificacionVistaDto
>;

export const centroNotificacionesDto = z.object({
  items: z.array(notificacionDto),
  total: z.number(),
});
export type CentroNotificacionesDto = z.infer<typeof centroNotificacionesDto>;

import { z } from "zod";

/** DTOs del Centro de Notificaciones (feed unificado del nutricionista). */

export const TIPOS_NOTIFICACION = ["ALERTA", "MENSAJE", "CORREO"] as const;

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
});
export type NotificacionDto = z.infer<typeof notificacionDto>;

export const centroNotificacionesDto = z.object({
  items: z.array(notificacionDto),
  total: z.number(),
});
export type CentroNotificacionesDto = z.infer<typeof centroNotificacionesDto>;

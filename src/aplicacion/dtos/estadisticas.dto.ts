import { z } from "zod";

/** DTOs de Estadísticas del consultorio. */

export const rangoEstadisticasDto = z
  .object({
    desde: z.coerce.date(),
    hasta: z.coerce.date(),
  })
  .refine((d) => d.hasta >= d.desde, {
    message: "El rango está invertido",
    path: ["hasta"],
  });
export type RangoEstadisticasDto = z.infer<typeof rangoEstadisticasDto>;

export const TIPOS_DETALLE = ["EN_RIESGO", "NUEVOS", "ACTIVOS"] as const;

export const detalleEstadisticaDto = z
  .object({
    tipo: z.enum(TIPOS_DETALLE),
    desde: z.coerce.date(),
    hasta: z.coerce.date(),
  })
  .refine((d) => d.hasta >= d.desde, { message: "El rango está invertido", path: ["hasta"] });
export type DetalleEstadisticaDto = z.infer<typeof detalleEstadisticaDto>;

export const pacienteEstadisticaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  apellido: z.string(),
  referencia: z.date().nullable(),
});
export type PacienteEstadisticaDto = z.infer<typeof pacienteEstadisticaDto>;

export const estadisticasSalidaDto = z.object({
  pacientesActivos: z.number(),
  pacientesNuevos: z.number(),
  pacientesEnRiesgo: z.number(),
  turnos: z.object({
    completados: z.number(),
    cancelados: z.number(),
    pendientes: z.number(),
    total: z.number(),
  }),
  tasaAsistencia: z.number(),
  ingresos: z.object({
    cobrado: z.number(),
    pendiente: z.number(),
  }),
  serieMensual: z.array(
    z.object({
      mes: z.string(),
      total: z.number(),
      completados: z.number(),
    }),
  ),
  diasAbandono: z.number(),
});
export type EstadisticasSalidaDto = z.infer<typeof estadisticasSalidaDto>;

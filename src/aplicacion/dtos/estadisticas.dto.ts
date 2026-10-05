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
  .refine((d) => d.hasta >= d.desde, {
    message: "El rango está invertido",
    path: ["hasta"],
  });
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
  /** Corte por sede del período, de mayor a menor ingreso cobrado. */
  porEstablecimiento: z.array(
    z.object({
      establecimientoId: z.string(),
      nombre: z.string(),
      turnos: z.number(),
      completados: z.number(),
      ingresoCobrado: z.number(),
      ingresoPendiente: z.number(),
    }),
  ),
  diasAbandono: z.number(),
});
export type EstadisticasSalidaDto = z.infer<typeof estadisticasSalidaDto>;

const totalesCobroDto = z.object({
  cobrado: z.number(),
  pendiente: z.number(),
  turnosPendientes: z.number(),
});

/**
 * Cobros de la semana en curso y de lo posterior a hoy. No depende del
 * período: siempre es respecto de hoy (ver `ObtenerResumenCobros`).
 */
export const resumenCobrosSalidaDto = z.object({
  semana: totalesCobroDto.extend({ desde: z.date(), hasta: z.date() }),
  futuro: totalesCobroDto,
});
export type ResumenCobrosSalidaDto = z.infer<typeof resumenCobrosSalidaDto>;

import { z } from "zod";
import { FUENTES_METRICA } from "@/dominio/entidades/MetricaDispositivo";

/** DTOs de las métricas de dispositivo (wearables). */

const metricaDia = z.object({
  fecha: z.coerce.date(),
  fuente: z.enum(FUENTES_METRICA).default("MANUAL"),
  pasos: z.number().int().min(0).max(200000).nullable().optional(),
  minutosActividad: z.number().int().min(0).max(1440).nullable().optional(),
  caloriasActivas: z.number().int().min(0).max(20000).nullable().optional(),
  frecuenciaCardiacaReposo: z.number().int().min(0).max(250).nullable().optional(),
  horasSueno: z.number().min(0).max(24).nullable().optional(),
});

export const importarMetricasDto = z.object({
  dias: z.array(metricaDia).min(1).max(370),
});
export type ImportarMetricasDto = z.infer<typeof importarMetricasDto>;

export const rangoMetricasDto = z.object({
  desde: z.coerce.date(),
  hasta: z.coerce.date(),
});
export type RangoMetricasDto = z.infer<typeof rangoMetricasDto>;

export const rangoMetricasDePacienteDto = rangoMetricasDto.extend({
  pacienteId: z.string().min(1),
});
export type RangoMetricasDePacienteDto = z.infer<typeof rangoMetricasDePacienteDto>;

export const fijarInclusionDto = z.object({
  fecha: z.coerce.date(),
  incluir: z.boolean(),
});
export type FijarInclusionDto = z.infer<typeof fijarInclusionDto>;

export const metricaSalidaDto = z.object({
  fecha: z.date(),
  fuente: z.enum(FUENTES_METRICA),
  pasos: z.number().nullable(),
  minutosActividad: z.number().nullable(),
  caloriasActivas: z.number().nullable(),
  frecuenciaCardiacaReposo: z.number().nullable(),
  horasSueno: z.number().nullable(),
  incluir: z.boolean(),
});
export type MetricaSalidaDto = z.infer<typeof metricaSalidaDto>;

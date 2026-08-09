import { z } from "zod";

/** DTOs de la Configuración del consultorio. */

const horaHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm");

export const guardarConfiguracionDto = z.object({
  turnoDuracionMinutos: z.number().int().min(5).max(480).optional(),
  turnoPasoMinutos: z.number().int().min(5).max(480).optional(),
  atencionHoraDesde: horaHHmm.nullable().optional(),
  atencionHoraHasta: horaHHmm.nullable().optional(),
  diasAtencion: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  nombreProfesional: z.string().max(200).nullable().optional(),
  matricula: z.string().max(100).nullable().optional(),
  logoArchivoId: z.string().nullable().optional(),
  pdfColorPrimario: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color hexadecimal inválido")
    .nullable()
    .optional(),
  pdfSubtitulo: z.string().max(200).nullable().optional(),
  pdfPieTexto: z.string().max(500).nullable().optional(),
  pdfMostrarRecetas: z.boolean().optional(),
  pdfMostrarMacros: z.boolean().optional(),
  pdfMostrarEquivalencias: z.boolean().optional(),
  pdfMostrarRecomendaciones: z.boolean().optional(),
});
export type GuardarConfiguracionDto = z.infer<typeof guardarConfiguracionDto>;

export const configuracionSalidaDto = z.object({
  id: z.string(),
  turnoDuracionMinutos: z.number(),
  turnoPasoMinutos: z.number(),
  atencionHoraDesde: z.string().nullable(),
  atencionHoraHasta: z.string().nullable(),
  diasAtencion: z.array(z.number()),
  nombreProfesional: z.string().nullable(),
  matricula: z.string().nullable(),
  logoArchivoId: z.string().nullable(),
  pdfColorPrimario: z.string().nullable(),
  pdfSubtitulo: z.string().nullable(),
  pdfPieTexto: z.string().nullable(),
  pdfMostrarRecetas: z.boolean(),
  pdfMostrarMacros: z.boolean(),
  pdfMostrarEquivalencias: z.boolean(),
  pdfMostrarRecomendaciones: z.boolean(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type ConfiguracionSalidaDto = z.infer<typeof configuracionSalidaDto>;

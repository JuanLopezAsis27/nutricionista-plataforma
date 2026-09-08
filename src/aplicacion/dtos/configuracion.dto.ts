import { z } from "zod";

/**
 * DTOs de la Configuración del consultorio: lo que describe al PROFESIONAL.
 *
 * La agenda (días, horario, duración y paso del turno) se fue a
 * `establecimiento.dto.ts` en la migración 49: es del LUGAR, y un consultorio
 * puede tener varias sedes con agendas distintas.
 */

export const guardarConfiguracionDto = z.object({
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
  whatsappPrefijoPais: z
    .string()
    .regex(/^\d{1,4}$/, 'El prefijo debe ser solo dígitos, sin "+"')
    .nullable()
    .optional(),
});
export type GuardarConfiguracionDto = z.infer<typeof guardarConfiguracionDto>;

export const configuracionSalidaDto = z.object({
  id: z.string(),
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
  whatsappPrefijoPais: z.string().nullable(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type ConfiguracionSalidaDto = z.infer<typeof configuracionSalidaDto>;

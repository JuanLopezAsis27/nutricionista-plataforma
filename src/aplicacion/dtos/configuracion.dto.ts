import { z } from "zod";
import { METODOS_GRASA } from "@/dominio/servicios/grasaPorPliegues";
import { CAMPOS_PLANTILLA } from "@/dominio/entidades/PlantillaAntropometrica";
import { LARGO_MAXIMO_NOMBRE_PROFESIONAL } from "@/dominio/entidades/nombreProfesional";

/**
 * DTOs de la Configuración del consultorio: lo que describe al PROFESIONAL.
 *
 * La agenda (días, horario, duración y paso del turno) se fue a
 * `establecimiento.dto.ts` en la migración 49: es del LUGAR, y un consultorio
 * puede tener varias sedes con agendas distintas.
 */

export const guardarConfiguracionDto = z.object({
  // Se puede cambiar pero no vaciar: es la firma de los emails y el
  // {{profesional}} de los recordatorios. No es de la configuración (vive en
  // `nutricionistas.nombre`): el servicio lo separa al guardar.
  nombreProfesional: z
    .string()
    .trim()
    .min(1, "El nombre del profesional es obligatorio")
    .max(LARGO_MAXIMO_NOMBRE_PROFESIONAL)
    .optional(),
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
  whatsappCancelaciones: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,25}$/, "Escribí un número de teléfono")
    .nullable()
    .optional(),
  bienvenidaAutomaticaActiva: z.boolean().optional(),
  formulasGrasaVisibles: z
    .array(z.enum(METODOS_GRASA))
    .min(1, "Tiene que quedar al menos una ecuación de grasa visible.")
    .optional(),
  // El piso real de cada protocolo —Kerr en 5 componentes, una ecuación de
  // grasa en 2— lo impone la entidad: acá no entra porque depende de QUÉ
  // campos son, no de cuántos.
  camposDosComponentes: z
    .array(z.enum(CAMPOS_PLANTILLA))
    .min(1, "Elegí al menos un campo")
    .optional(),
  camposCincoComponentes: z
    .array(z.enum(CAMPOS_PLANTILLA))
    .min(1, "Elegí al menos un campo")
    .optional(),
  analisisFotoComidaAutomatico: z.boolean().optional(),
});
export type GuardarConfiguracionDto = z.infer<typeof guardarConfiguracionDto>;

export const configuracionSalidaDto = z.object({
  id: z.string(),
  /** De `nutricionistas.nombre`; nunca falta (migración 74). */
  nombreProfesional: z.string(),
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
  whatsappCancelaciones: z.string().nullable(),
  bienvenidaAutomaticaActiva: z.boolean(),
  formulasGrasaVisibles: z.array(z.enum(METODOS_GRASA)),
  camposDosComponentes: z.array(z.enum(CAMPOS_PLANTILLA)),
  camposCincoComponentes: z.array(z.enum(CAMPOS_PLANTILLA)),
  analisisFotoComidaAutomatico: z.boolean(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type ConfiguracionSalidaDto = z.infer<typeof configuracionSalidaDto>;

import { z } from "zod";
import { CONTEXTOS_ARCHIVO_LISTA } from "@/dominio/entidades/Archivo";

/** DTOs de Archivo — esquemas Zod de entrada/salida. */

export const contextoArchivoDto = z.enum(
  CONTEXTOS_ARCHIVO_LISTA as [string, ...string[]],
);

export const subirArchivoDto = z.object({
  nombreOriginal: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  contexto: contextoArchivoDto,
  titulo: z.string().max(200).optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
  /** Dueño directo opcional (archivos de la ficha del paciente). */
  pacienteId: z.string().min(1).optional().nullable(),
  /**
   * Qué día muestra la foto, para el contexto `progreso`. Viene como
   * "2026-03-10" del input de fecha y se guarda como DATE sin hora, igual que
   * la fecha de una evolución o de una medición.
   */
  fechaProgreso: z.coerce.date().optional().nullable(),
});
export type SubirArchivoDto = z.infer<typeof subirArchivoDto>;

export const idArchivoDto = z.object({ id: z.string().min(1) });
export type IdArchivoDto = z.infer<typeof idArchivoDto>;

export const archivoSalidaDto = z.object({
  id: z.string(),
  clave: z.string(),
  nombreOriginal: z.string(),
  mimeType: z.string(),
  tamanoBytes: z.number(),
  titulo: z.string().nullable(),
  categoria: z.string().nullable(),
  subidoPorId: z.string().nullable(),
  /** Solo en las fotos de progreso; null en el resto. */
  fechaProgreso: z.date().nullable(),
  creadoEn: z.date(),
  /** Contexto de origen deducido de la clave (`null` si no se reconoce). */
  contexto: contextoArchivoDto.nullable(),
});
export type ArchivoSalidaDto = z.infer<typeof archivoSalidaDto>;

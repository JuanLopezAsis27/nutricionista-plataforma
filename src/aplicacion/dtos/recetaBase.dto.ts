import { z } from "zod";
import { camposRecetaDto, recetaSalidaDto } from "./receta.dto";

/**
 * DTOs del catálogo de recetas de la plataforma (migración 82).
 *
 * Una receta de la plataforma son los campos de una receta sin lo que es de un
 * consultorio (fotos, documentos, carpeta): por eso se arma desde
 * `camposRecetaDto` y no se escribe de nuevo —dos copias de la regla terminan
 * aceptando cosas distintas—.
 */

export const crearRecetaBaseDto = camposRecetaDto;
export type CrearRecetaBaseDto = z.infer<typeof crearRecetaBaseDto>;

export const actualizarRecetaBaseDto = camposRecetaDto.extend({
  id: z.string().min(1),
});
export type ActualizarRecetaBaseDto = z.infer<typeof actualizarRecetaBaseDto>;

export const idRecetaBaseDto = z.object({ id: z.string().min(1) });

export const listarRecetasBaseDto = z.object({
  texto: z.string().max(160).optional(),
  etiqueta: z.string().max(60).optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(20),
});
export type ListarRecetasBaseDto = z.infer<typeof listarRecetasBaseDto>;

/** Misma salida que una receta del recetario, sin fotos ni carpeta. */
export const recetaBaseSalidaDto = recetaSalidaDto.omit({
  fotos: true,
  documentos: true,
  fotoPrincipalId: true,
  grupoId: true,
  grupoNombre: true,
  recetaBaseId: true,
});
export type RecetaBaseSalidaDto = z.infer<typeof recetaBaseSalidaDto>;

export interface RecetasBasePaginadas {
  recetas: RecetaBaseSalidaDto[];
  total: number;
  paginas: number;
}

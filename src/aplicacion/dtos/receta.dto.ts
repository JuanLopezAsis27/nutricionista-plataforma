import { z } from "zod";

/** DTOs de Receta — esquemas Zod de entrada/salida del recetario. */

const macros = {
  calorias: z.number().int().min(0).max(100000).optional().nullable(),
  proteinasG: z.number().min(0).max(10000).optional().nullable(),
  carbohidratosG: z.number().min(0).max(10000).optional().nullable(),
  grasasG: z.number().min(0).max(10000).optional().nullable(),
};

const recetaBase = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(1000).optional().nullable(),
  porciones: z.number().int().min(1).max(100).optional().nullable(),
  preparacion: z.string().max(5000).optional().nullable(),
  ingredientes: z.array(z.string().max(300)).max(100).optional(),
  etiquetas: z.array(z.string().max(60)).max(30).optional(),
  ...macros,
});

export const crearRecetaDto = recetaBase.extend({
  fotoIds: z.array(z.string().min(1)).max(10).optional(),
});
export type CrearRecetaDto = z.infer<typeof crearRecetaDto>;

export const actualizarRecetaDto = recetaBase.extend({
  id: z.string().min(1),
  fotoIdsNuevos: z.array(z.string().min(1)).max(10).optional(),
});
export type ActualizarRecetaDto = z.infer<typeof actualizarRecetaDto>;

export const idRecetaDto = z.object({ id: z.string().min(1) });
export type IdRecetaDto = z.infer<typeof idRecetaDto>;

export const filtroRecetasDto = z
  .object({
    texto: z.string().max(160).optional(),
    etiqueta: z.string().max(60).optional(),
  })
  .optional();
export type FiltroRecetasDto = z.infer<typeof filtroRecetasDto>;

export const asignarRecetaDto = z.object({
  recetaId: z.string().min(1),
  pacienteId: z.string().min(1),
});
export type AsignarRecetaDto = z.infer<typeof asignarRecetaDto>;

const fotoRecetaSalidaDto = z.object({
  id: z.string(),
  nombreOriginal: z.string(),
  mimeType: z.string(),
});

export const recetaSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  porciones: z.number().nullable(),
  preparacion: z.string().nullable(),
  ingredientes: z.array(z.string()),
  etiquetas: z.array(z.string()),
  calorias: z.number().nullable(),
  proteinasG: z.number().nullable(),
  carbohidratosG: z.number().nullable(),
  grasasG: z.number().nullable(),
  fotos: z.array(fotoRecetaSalidaDto),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type RecetaSalidaDto = z.infer<typeof recetaSalidaDto>;

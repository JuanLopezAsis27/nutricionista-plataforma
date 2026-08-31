import { z } from "zod";

/** DTOs de Receta — esquemas Zod de entrada/salida del recetario. */

const macros = {
  calorias: z.number().int().min(0).max(100000).optional().nullable(),
  proteinasG: z.number().min(0).max(10000).optional().nullable(),
  carbohidratosG: z.number().min(0).max(10000).optional().nullable(),
  grasasG: z.number().min(0).max(10000).optional().nullable(),
};

/** Ingrediente estructurado de entrada: nombre + gramos + macros por 100 g. */
const ingredienteEntradaDto = z.object({
  nombre: z.string().min(1).max(200),
  cantidadGramos: z.number().min(0).max(100000).optional().nullable(),
  caloriasPor100: z.number().min(0).max(1000).optional().nullable(),
  proteinasPor100: z.number().min(0).max(100).optional().nullable(),
  carbohidratosPor100: z.number().min(0).max(100).optional().nullable(),
  grasasPor100: z.number().min(0).max(100).optional().nullable(),
  fuente: z.string().max(20).optional().nullable(),
  referenciaExterna: z.string().max(100).optional().nullable(),
});

const recetaBase = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(1000).optional().nullable(),
  porciones: z.number().int().min(1).max(100).optional().nullable(),
  preparacion: z.string().max(5000).optional().nullable(),
  ingredientes: z.array(ingredienteEntradaDto).max(100).optional(),
  etiquetas: z.array(z.string().max(60)).max(30).optional(),
  enlaces: z
    .array(z.string().url("Debe ser una URL válida").max(500))
    .max(20)
    .optional(),
  ...macros,
});

/**
 * Portada elegida en el mismo guardado.
 *
 * Está en el alta y en la edición porque hasta que existió no había forma de
 * elegir portada entre las fotos que se acababan de subir: `marcarFotoPrincipal`
 * exige una foto YA vinculada, y las fotos nuevas se vinculan recién al
 * guardar. El profesional tenía que guardar, reabrir y recién ahí elegir.
 */
const fotoPrincipalElegida = z.string().min(1).optional();

export const crearRecetaDto = recetaBase.extend({
  fotoIds: z.array(z.string().min(1)).max(10).optional(),
  documentoIds: z.array(z.string().min(1)).max(10).optional(),
  fotoPrincipalId: fotoPrincipalElegida,
});
export type CrearRecetaDto = z.infer<typeof crearRecetaDto>;

export const actualizarRecetaDto = recetaBase.extend({
  id: z.string().min(1),
  fotoIdsNuevos: z.array(z.string().min(1)).max(10).optional(),
  documentoIdsNuevos: z.array(z.string().min(1)).max(10).optional(),
  fotoPrincipalId: fotoPrincipalElegida,
});
export type ActualizarRecetaDto = z.infer<typeof actualizarRecetaDto>;

export const archivoDeRecetaDto = z.object({
  recetaId: z.string().min(1),
  archivoId: z.string().min(1),
});
export type ArchivoDeRecetaDto = z.infer<typeof archivoDeRecetaDto>;

export const marcarFotoPrincipalDto = z.object({
  recetaId: z.string().min(1),
  /** null vuelve a la elección automática (la primera foto). */
  fotoId: z.string().min(1).nullable(),
});
export type MarcarFotoPrincipalDto = z.infer<typeof marcarFotoPrincipalDto>;

export const idRecetaDto = z.object({ id: z.string().min(1) });
export type IdRecetaDto = z.infer<typeof idRecetaDto>;

export const filtroRecetasDto = z
  .object({
    texto: z.string().max(160).optional(),
    etiqueta: z.string().max(60).optional(),
  })
  .optional();
export type FiltroRecetasDto = z.infer<typeof filtroRecetasDto>;

/** Listado paginado del recetario (10 por página por defecto). */
export const listarRecetasPaginadoDto = z.object({
  texto: z.string().max(160).optional(),
  etiqueta: z.string().max(60).optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(10),
});
export type ListarRecetasPaginadoDto = z.infer<typeof listarRecetasPaginadoDto>;

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

const documentoRecetaSalidaDto = fotoRecetaSalidaDto;

const ingredienteSalidaDto = z.object({
  nombre: z.string(),
  cantidadGramos: z.number().nullable(),
  caloriasPor100: z.number().nullable(),
  proteinasPor100: z.number().nullable(),
  carbohidratosPor100: z.number().nullable(),
  grasasPor100: z.number().nullable(),
  fuente: z.string().nullable(),
  referenciaExterna: z.string().nullable(),
});

const macrosSalidaDto = z.object({
  calorias: z.number().nullable(),
  proteinasG: z.number().nullable(),
  carbohidratosG: z.number().nullable(),
  grasasG: z.number().nullable(),
});

export const recetaSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  porciones: z.number().nullable(),
  preparacion: z.string().nullable(),
  ingredientes: z.array(ingredienteSalidaDto),
  etiquetas: z.array(z.string()),
  enlaces: z.array(z.string()),
  // Macros por porción (calculados de los ingredientes o cargados a mano).
  calorias: z.number().nullable(),
  proteinasG: z.number().nullable(),
  carbohidratosG: z.number().nullable(),
  grasasG: z.number().nullable(),
  /** Macros TOTALES de la receta (suma de ingredientes con datos). */
  totales: macrosSalidaDto,
  /** true si los macros por porción salen del cálculo de ingredientes. */
  macrosCalculados: z.boolean(),
  fotos: z.array(fotoRecetaSalidaDto),
  documentos: z.array(documentoRecetaSalidaDto),
  /**
   * La foto que representa la receta, ya resuelta por el dominio: si no hay
   * una elegida, viene la primera disponible. La UI no repite ese fallback.
   */
  fotoPrincipalId: z.string().nullable(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type RecetaSalidaDto = z.infer<typeof recetaSalidaDto>;

/** Resultado paginado del recetario. */
export interface RecetasPaginadas {
  recetas: RecetaSalidaDto[];
  total: number;
  paginas: number;
}

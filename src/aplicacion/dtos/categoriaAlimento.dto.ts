import { z } from "zod";
import { LARGO_MAXIMO_NOMBRE_CATEGORIA } from "@/dominio/entidades/CategoriaAlimento";

/** DTOs de las categorías de alimento (migración 93). */

/** El id de una categoría elegida en un filtro o un formulario. */
export const idCategoriaAlimentoDto = z.string().min(1).max(64);

export const crearCategoriaAlimentoDto = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Indicá el nombre")
    .max(LARGO_MAXIMO_NOMBRE_CATEGORIA),
});
export type CrearCategoriaAlimentoDto = z.infer<
  typeof crearCategoriaAlimentoDto
>;

export const renombrarCategoriaAlimentoDto = crearCategoriaAlimentoDto.extend({
  id: idCategoriaAlimentoDto,
});
export type RenombrarCategoriaAlimentoDto = z.infer<
  typeof renombrarCategoriaAlimentoDto
>;

export const eliminarCategoriaAlimentoDto = z.object({
  id: idCategoriaAlimentoDto,
});

export const moverCategoriaAlimentoDto = z.object({
  id: idCategoriaAlimentoDto,
  direccion: z.enum(["ARRIBA", "ABAJO"]),
});

/** Una categoría tal como la ve la pantalla, y como viaja dentro de un alimento. */
export const categoriaAlimentoSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  /** true = del consultorio; false = predeterminada de la plataforma. */
  propia: z.boolean(),
});
export type CategoriaAlimentoSalidaDto = z.infer<
  typeof categoriaAlimentoSalidaDto
>;

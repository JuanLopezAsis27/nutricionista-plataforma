import { z } from "zod";
import { CATEGORIAS_ALIMENTO } from "@/dominio/entidades/AlimentoPropio";
import {
  medidaAlimentoDto,
  unidadBaseAlimentoDto,
} from "./medidasAlimento.dto";

/** DTOs de la búsqueda de datos nutricionales de ingredientes. */

/**
 * Con categoría, el término puede venir vacío: es «mostrame los lácteos»
 * (migración 84). Sin categoría ni término es HOJEAR: los primeros `limite`
 * de las listas cargadas, para que el modal no arranque vacío. Una sola letra
 * no se acepta como búsqueda.
 *
 * El tope de `limite` es lo que impide traer la lista entera de una vez: el
 * modal pide de a tandas («Mostrar más») hasta este máximo.
 */
export const LIMITE_MAXIMO_BUSQUEDA_ALIMENTOS = 96;

export const buscarAlimentoDto = z
  .object({
    termino: z.string().max(120),
    limite: z
      .number()
      .int()
      .min(1)
      .max(LIMITE_MAXIMO_BUSQUEDA_ALIMENTOS)
      .optional(),
    categoria: z.enum(CATEGORIAS_ALIMENTO).optional(),
  })
  .refine((d) => d.categoria || d.termino.trim().length !== 1, {
    message: "Escribí al menos 2 caracteres",
    path: ["termino"],
  });
export type BuscarAlimentoDto = z.infer<typeof buscarAlimentoDto>;

export const alimentoNutricionalSalidaDto = z.object({
  nombre: z.string(),
  marca: z.string().nullable(),
  referenciaExterna: z.string().nullable(),
  fuente: z.string(),
  caloriasPor100: z.number().nullable(),
  proteinasPor100: z.number().nullable(),
  carbohidratosPor100: z.number().nullable(),
  grasasPor100: z.number().nullable(),
  id: z.string().nullable(),
  categoria: z.enum(CATEGORIAS_ALIMENTO).nullable(),
  imagenVersion: z.string().nullable(),
  unidadBase: unidadBaseAlimentoDto,
  medidas: z.array(medidaAlimentoDto),
});
export type AlimentoNutricionalSalidaDto = z.infer<
  typeof alimentoNutricionalSalidaDto
>;

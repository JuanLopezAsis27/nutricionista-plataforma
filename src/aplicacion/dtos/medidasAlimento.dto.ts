import { z } from "zod";
import {
  UNIDADES_BASE_ALIMENTO,
  MAXIMO_MEDIDAS_ALIMENTO,
  LARGO_MAXIMO_NOMBRE_MEDIDA,
} from "@/dominio/entidades/medidasAlimento";

/**
 * Esquemas de las medidas de un alimento (migración 90), compartidos por la
 * lista de alimentos y por todos los lugares donde se usa uno (opción del
 * plan, ingrediente de receta, comida del plan semanal). Ver
 * docs/MEDIDAS-ALIMENTOS.md.
 */

export const unidadBaseAlimentoDto = z.enum(UNIDADES_BASE_ALIMENTO);

/** «1 <nombre> = <cantidad> g/ml». */
export const medidaAlimentoDto = z.object({
  nombre: z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE_MEDIDA),
  cantidad: z.number().positive().max(100000),
});
export type MedidaAlimentoDto = z.infer<typeof medidaAlimentoDto>;

export const medidasAlimentoDto = z
  .array(medidaAlimentoDto)
  .max(MAXIMO_MEDIDAS_ALIMENTO);

/**
 * Cómo se indicó la cantidad de un alimento usado, al ENTRAR. Todo opcional:
 * sin nada es lo de siempre, gramos en `cantidadGramos`. Con `medida`, la
 * cantidad en g/ml la calcula el dominio (`normalizarCantidadDeAlimento`).
 */
export const cantidadAlimentoEntradaDto = {
  unidadBase: unidadBaseAlimentoDto.optional(),
  medidas: medidasAlimentoDto.optional(),
  medida: z.string().max(LARGO_MAXIMO_NOMBRE_MEDIDA).nullable().optional(),
  cantidadMedida: z.number().min(0).max(10000).nullable().optional(),
  cantidadPorMedida: z.number().positive().max(100000).nullable().optional(),
};

/** Lo mismo, al SALIR, con la cantidad lista para leer. */
export const cantidadAlimentoSalidaDto = {
  unidadBase: unidadBaseAlimentoDto,
  medidas: z.array(medidaAlimentoDto),
  medida: z.string().nullable(),
  cantidadMedida: z.number().nullable(),
  cantidadPorMedida: z.number().nullable(),
  /** «2 cucharadas (30 ml)», «150 g»; null sin cantidad. */
  cantidadTexto: z.string().nullable(),
};

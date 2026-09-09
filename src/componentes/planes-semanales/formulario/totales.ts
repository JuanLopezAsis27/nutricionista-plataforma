import type { DiaSemana } from "@/dominio/entidades/PlanSemanal";
import { DIAS_SEMANA } from "@/dominio/entidades/PlanSemanal";
import {
  calcularTotales,
  sumarMacros,
  escalarMacros,
  MACROS_VACIOS,
  type Macros,
} from "@/componentes/comunes/alimentos/macros";
import {
  aNumero,
  tieneContenido,
  SIN_RECETA,
  type ComidaFormulario,
  type DatosFormulario,
} from "./esquema";

/**
 * Totales del plan semanal MIENTRAS SE EDITA.
 *
 * Es el espejo de `PlanSemanal.macrosDe` y `totalesPorDia`: la grilla tiene que
 * mostrar cuánto suma cada día a medida que se cargan las comidas, y la
 * presentación no puede llamar al dominio. Las dos implementaciones tienen que
 * decir lo mismo, y de eso se ocupa `totales.test.ts`.
 *
 * La regla que más se presta a copiarse mal: suma la comida PRINCIPAL de cada
 * franja —la primera cargada de esa celda— porque las demás son alternativas
 * suyas. Sumarlas todas daría el triple de calorías para un día con tres
 * opciones de almuerzo.
 */

/** Macros por porción de cada receta, indexadas por id. */
export type MacrosDeRecetas = ReadonlyMap<string, Macros>;

/** Macros de una comida: sus alimentos más la receta por sus porciones. */
export function macrosDeComida(
  comida: ComidaFormulario,
  recetas: MacrosDeRecetas,
): Macros {
  const deItems = calcularTotales(comida.items);
  const receta =
    comida.recetaId !== SIN_RECETA ? recetas.get(comida.recetaId) : undefined;
  if (!receta) return deItems;
  return sumarMacros(
    deItems,
    escalarMacros(receta, aNumero(comida.porciones) ?? 1),
  );
}

/** La comida que rige ese día en esa franja: la primera CARGADA. */
export function principalDelDia(
  comidas: ComidaFormulario[],
  dia: DiaSemana,
): ComidaFormulario | null {
  return (
    comidas.find((comida) => comida.dia === dia && tieneContenido(comida)) ??
    null
  );
}

/** Lo que suma cada día de la semana, con la principal de cada franja. */
export function totalesPorDia(
  franjas: DatosFormulario["franjas"],
  recetas: MacrosDeRecetas,
): Record<DiaSemana, Macros> {
  const totales = {} as Record<DiaSemana, Macros>;
  for (const dia of DIAS_SEMANA) {
    totales[dia] = franjas
      .map((franja) => principalDelDia(franja.comidas, dia))
      .filter((comida): comida is ComidaFormulario => comida !== null)
      .map((comida) => macrosDeComida(comida, recetas))
      .reduce(sumarMacros, MACROS_VACIOS);
  }
  return totales;
}

import type { PlanSemanalSalidaDto } from "@/aplicacion/dtos/planSemanal.dto";

/** Una comida tal como sale del servicio, con sus macros ya resueltos. */
export type ComidaSemanalSalida =
  PlanSemanalSalidaDto["franjas"][number]["comidas"][number];

/**
 * Qué se lee de una comida: su texto, o la receta, o sus alimentos.
 *
 * Vive acá y no en cada vista porque el menú se lee en dos pantallas —la
 * grilla del consultorio y la vista de un día del paciente— y las dos tienen
 * que decir exactamente lo mismo de la misma comida. Con una copia por vista,
 * el día que se agregue una tercera fuente de texto una de las dos la ignora.
 */
export function textoDeComida(comida: ComidaSemanalSalida): string {
  if (comida.descripcion?.trim()) return comida.descripcion.trim();
  if (comida.recetaNombre) return comida.recetaNombre;
  const alimentos = comida.items.map((item) => item.nombre).filter(Boolean);
  return alimentos.length > 0 ? alimentos.join(", ") : "Sin cargar";
}

/** Los macros de una comida en una línea: «320 kcal · 20 P · 40 C · 8 G». */
export function macrosEnLinea(
  macros: ComidaSemanalSalida["macros"],
): string | null {
  const partes = [
    macros.calorias != null && `${macros.calorias} kcal`,
    macros.proteinasG != null && `${macros.proteinasG} g P`,
    macros.carbohidratosG != null && `${macros.carbohidratosG} g C`,
    macros.grasasG != null && `${macros.grasasG} g G`,
  ].filter(Boolean) as string[];
  return partes.length > 0 ? partes.join(" · ") : null;
}

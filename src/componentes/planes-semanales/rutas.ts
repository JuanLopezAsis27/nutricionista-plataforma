/**
 * Las rutas del plan semanal en el consultorio. Viven en un solo lugar porque
 * se llega desde el listado, desde la ficha del paciente y de vuelta desde la
 * página del plan.
 */

/** La pestaña «Planes semanales» de `/dashboard/planes`. */
export const RUTA_PLANES_SEMANALES = "/dashboard/planes?pestana=semanales";

/** La página de un plan semanal (como `/dashboard/planes/[id]` en los planes). */
export function rutaPlanSemanal(id: string): string {
  return `/dashboard/planes/semanales/${id}`;
}

/**
 * El diálogo del editor: crece con su contenido y scrollea entero. Tuvo un
 * alto fijo (92 vh) con la grilla deslizándose adentro, y en pantallas bajas
 * —y en mobile— eso dejaba la semana aplastada en una franja de 200 px: el
 * alto de la grilla lo tiene que poner la grilla, no el de la ventana.
 */
export const CLASES_DIALOGO_PLAN_SEMANAL =
  "max-h-[95dvh] w-[97vw] max-w-[100rem] overflow-y-auto";

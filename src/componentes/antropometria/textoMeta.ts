import type {
  MetaNumerica,
  ProyeccionMeta,
} from "@/dominio/servicios/proyeccionComposicion";
import { formatearMedida } from "@/lib/formato";

/**
 * El número de una meta escrito para la pantalla: «12,00 kg» o, si es un
 * rango, «entre 12,00 y 15,00 kg».
 *
 * Es uno solo para todas las pantallas que nombran la meta (la tarjeta del
 * consultorio, la del portal, el objetivo cualitativo vinculado): con una
 * copia por pantalla, la primera que se olvide del rango muestra un «—».
 */
export function textoMeta(
  p: Pick<ProyeccionMeta, "valorObjetivo" | "rango" | "unidad">,
  formatear: (valor: number | null) => string = formatearMedida,
): string {
  const unidad = p.unidad ? ` ${p.unidad}` : "";
  if (p.rango != null) {
    return `entre ${formatear(p.rango.minimo)} y ${formatear(p.rango.maximo)}${unidad}`;
  }
  return `${formatear(p.valorObjetivo)}${unidad}`;
}

/**
 * La meta de una proyección, en la forma que leen las funciones del dominio.
 * La proyección trae siempre uno de los dos: el valor o el rango.
 */
export function metaDeProyeccion(
  p: Pick<ProyeccionMeta, "valorObjetivo" | "rango">,
): MetaNumerica {
  return p.rango != null
    ? { rango: p.rango }
    : { valorObjetivo: p.valorObjetivo! };
}

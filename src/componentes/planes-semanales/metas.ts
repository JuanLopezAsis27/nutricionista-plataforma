import type { TipoMeta } from "@/dominio/servicios/comparacionMacros";
import type {
  DiaComparadoDto,
  MacrosDto,
  MetasPlanSemanalSalidaDto,
} from "@/aplicacion/dtos/planSemanal.dto";

/**
 * Cómo se leen en pantalla las metas del plan semanal (migración 91). Lo
 * comparten la grilla, la tabla comparativa y la vista del paciente: con una
 * copia por vista, «≥ 120 g» en una diría «120 g» en la otra.
 */

/** Las cuatro macros, en el orden en que se leen en toda la app. */
export const MACROS_META = [
  { clave: "calorias", etiqueta: "Calorías", corta: "kcal", unidad: "kcal" },
  { clave: "proteinasG", etiqueta: "Proteínas", corta: "P", unidad: "g" },
  {
    clave: "carbohidratosG",
    etiqueta: "Carbohidratos",
    corta: "C",
    unidad: "g",
  },
  { clave: "grasasG", etiqueta: "Grasas", corta: "G", unidad: "g" },
] as const;

export type ClaveMacroMeta = (typeof MACROS_META)[number]["clave"];

/** «1800 kcal», «≥ 120 g», «≤ 60 g»: el tipo dice si es un piso o un techo. */
export function valorDeMeta(
  valor: number,
  unidad: string,
  tipo: TipoMeta,
): string {
  const prefijo = tipo === "MINIMO" ? "≥ " : tipo === "MAXIMO" ? "≤ " : "";
  return `${prefijo}${valor} ${unidad}`;
}

/**
 * Las metas de un día, leídas de su comparación: es el número contra el que
 * el dominio comparó ese día, así que no hay que repetir acá la regla de qué
 * meta rige (las generales o las del día). Null si el día no tiene ninguna.
 */
export function metasDelDia(dia: DiaComparadoDto): MacrosDto | null {
  const metas: MacrosDto = {
    calorias: dia.comparacion.calorias.meta,
    proteinasG: dia.comparacion.proteinasG.meta,
    carbohidratosG: dia.comparacion.carbohidratosG.meta,
    grasasG: dia.comparacion.grasasG.meta,
  };
  return Object.values(metas).some((v) => v != null) ? metas : null;
}

/** «1800 kcal · ≥ 120 g P · ≤ 60 g G», con los tipos del plan. */
export function metasEnTexto(
  valores: MacrosDto,
  tipos: MetasPlanSemanalSalidaDto["tipos"],
): string {
  return MACROS_META.flatMap((macro) => {
    const valor = valores[macro.clave];
    if (valor == null) return [];
    const texto = valorDeMeta(valor, macro.unidad, tipos[macro.clave]);
    return [macro.clave === "calorias" ? texto : `${texto} ${macro.corta}`];
  }).join(" · ");
}

/** ¿El plan declara alguna meta, en cualquiera de los dos modos? */
export function tieneMetas(metas: MetasPlanSemanalSalidaDto): boolean {
  return metas.modo === "GENERAL"
    ? metas.general !== null
    : metas.porDia.length > 0;
}

/** Una frase que dice contra qué se compara la semana. */
export function descripcionDeMetas(metas: MetasPlanSemanalSalidaDto): string {
  if (!tieneMetas(metas)) {
    return "Este plan semanal no tiene metas cargadas: los totales van sin comparar.";
  }
  if (metas.modo === "GENERAL" && metas.general) {
    return `Metas diarias, las mismas toda la semana: ${metasEnTexto(metas.general, metas.tipos)}.`;
  }
  return `Metas distintas para cada día (${metas.porDia.length} de 7 con metas): cada total se compara con la del suyo.`;
}

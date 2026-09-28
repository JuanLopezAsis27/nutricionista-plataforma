import type { Macros } from "./macrosAlimentos";

/**
 * Compara lo que suma un día contra las metas diarias del paciente.
 *
 * Las metas NO son del plan semanal: son las del plan nutricional que el
 * paciente tiene asignado (`PlanNutricional.caloriasMeta` y sus macros). El
 * plan fija cuánto tiene que comer por día; el semanal es una forma de
 * repartirlo, y comparar el reparto contra su propia meta no diría nada.
 * Por eso un plan semanal que todavía no está asignado a nadie muestra
 * totales pero no semáforo: no hay contra qué compararlo.
 *
 * Cada meta dice además CÓMO se lee (migración 82): un objetivo aproximado, un
 * piso o un techo. «120 g de proteína como mínimo» se cumple con 150, y
 * leerlo con la tolerancia de siempre marcaría en rojo justo al plan que mejor
 * lo cumple.
 *
 * El APROXIMADO se decide con una TOLERANCIA relativa y no con la igualdad
 * exacta: ningún menú cae clavado en la meta, y un plan que diera "por debajo"
 * por 3 kcal haría que el semáforo estuviera siempre en rojo y dejara de
 * mirarse.
 */

/** Desvío admitido antes de marcar un día fuera de la meta (±10 %). */
export const TOLERANCIA_META = 0.1;

/**
 * Cómo se lee una meta. APROXIMADO es la lectura de siempre y el default: las
 * metas cargadas antes de que existiera el tipo significan eso.
 */
export const TIPOS_META = ["APROXIMADO", "MINIMO", "MAXIMO"] as const;
export type TipoMeta = (typeof TIPOS_META)[number];

/** El tipo de cada una de las cuatro metas. */
export type TiposMeta = Record<keyof Macros, TipoMeta>;

export const TIPOS_META_POR_DEFECTO: TiposMeta = {
  calorias: "APROXIMADO",
  proteinasG: "APROXIMADO",
  carbohidratosG: "APROXIMADO",
  grasasG: "APROXIMADO",
};

/**
 * En qué situación quedó una macro del día.
 *
 * `SIN_META` y `SIN_DATO` son cosas distintas y se distinguen a propósito: en
 * el primero el paciente no tiene esa meta cargada, en el segundo el menú del
 * día no tiene los macros suficientes para sumarla. Colapsarlos haría que un
 * plan al que le faltan datos se viera igual que uno que está bien.
 *
 * `EN_RANGO` quiere decir «cumple la meta», sea cual sea su tipo: dentro del
 * margen si es aproximada, por encima del piso o por debajo del techo.
 */
export const ESTADOS_META = [
  "SIN_META",
  "SIN_DATO",
  "POR_DEBAJO",
  "EN_RANGO",
  "POR_ENCIMA",
] as const;
export type EstadoMeta = (typeof ESTADOS_META)[number];

/** Una macro del día frente a su meta. */
export interface ComparacionMacro {
  /** Lo que suma el día (null si el menú no tiene ese dato). */
  valor: number | null;
  /** La meta diaria del paciente (null si no la tiene cargada). */
  meta: number | null;
  /** valor − meta. Null si falta alguno de los dos. */
  diferencia: number | null;
  estado: EstadoMeta;
  /** Cómo se leyó la meta. */
  tipo: TipoMeta;
}

/** El día completo frente a las metas. */
export interface ComparacionDia {
  calorias: ComparacionMacro;
  proteinasG: ComparacionMacro;
  carbohidratosG: ComparacionMacro;
  grasasG: ComparacionMacro;
}

/** Metas diarias del paciente, tal como salen del plan que tiene asignado. */
export interface MetasDiarias {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
  /** Cómo se lee cada una. Ausente = todas aproximadas. */
  tipos?: Partial<TiposMeta>;
}

export function compararConMetas(
  macros: Macros,
  metas: MetasDiarias | null,
): ComparacionDia {
  const tipo = (clave: keyof Macros): TipoMeta =>
    metas?.tipos?.[clave] ?? "APROXIMADO";
  return {
    calorias: compararMacro(
      macros.calorias,
      metas?.calorias ?? null,
      tipo("calorias"),
    ),
    proteinasG: compararMacro(
      macros.proteinasG,
      metas?.proteinasG ?? null,
      tipo("proteinasG"),
    ),
    carbohidratosG: compararMacro(
      macros.carbohidratosG,
      metas?.carbohidratosG ?? null,
      tipo("carbohidratosG"),
    ),
    grasasG: compararMacro(
      macros.grasasG,
      metas?.grasasG ?? null,
      tipo("grasasG"),
    ),
  };
}

export function compararMacro(
  valor: number | null,
  meta: number | null,
  tipo: TipoMeta = "APROXIMADO",
): ComparacionMacro {
  if (meta == null) {
    return { valor, meta: null, diferencia: null, estado: "SIN_META", tipo };
  }
  if (valor == null) {
    return { valor: null, meta, diferencia: null, estado: "SIN_DATO", tipo };
  }
  const diferencia = redondear1(valor - meta);
  const base = { valor, meta, diferencia, tipo };

  // Piso y techo son estrictos: «como mínimo 120» no se cumple con 115. Si el
  // profesional quiere margen, lo pone él en el número.
  if (tipo === "MINIMO") {
    return { ...base, estado: diferencia < 0 ? "POR_DEBAJO" : "EN_RANGO" };
  }
  if (tipo === "MAXIMO") {
    return { ...base, estado: diferencia > 0 ? "POR_ENCIMA" : "EN_RANGO" };
  }

  // La tolerancia se mide sobre la META y no sobre el valor: es la referencia
  // fija, y calcularla sobre el valor haría que el rango admisible se moviera
  // con el propio menú.
  const margen = Math.abs(meta) * TOLERANCIA_META;
  if (diferencia < -margen) return { ...base, estado: "POR_DEBAJO" };
  if (diferencia > margen) return { ...base, estado: "POR_ENCIMA" };
  return { ...base, estado: "EN_RANGO" };
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

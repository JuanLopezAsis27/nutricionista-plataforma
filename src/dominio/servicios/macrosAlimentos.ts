/**
 * Macros de un conjunto de alimentos: la suma de «cantidad en gramos × macros
 * por 100 g».
 *
 * Vive en un servicio de dominio y no adentro de una entidad porque la regla es
 * exactamente la misma en dos agregados —los ingredientes de una `Receta` y los
 * items de una comida de un `PlanSemanal`— y una segunda copia se desincroniza
 * en el primer arreglo que se aplique en una sola de las dos.
 *
 * `null` significa SIN DATO, no cero: un alimento sin calorías cargadas no baja
 * el total, lo deja indeterminado en esa columna. Por eso cada macro se suma
 * con su propio "¿alguien aportó algo?" y no con un acumulador que arranque en
 * 0 —así, un plan al que le falta el dato de un ingrediente muestra «—» en vez
 * de un total que parece completo y no lo es—.
 */

/** Macros de una preparación, una comida o un día. Todas opcionales. */
export interface Macros {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
}

/** Alimento con cantidad: lo que hace falta para sumarlo a un total. */
export interface AlimentoConCantidad {
  cantidadGramos: number | null;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
}

/** Ninguna macro conocida. */
export const MACROS_VACIOS: Macros = {
  calorias: null,
  proteinasG: null,
  carbohidratosG: null,
  grasasG: null,
};

/** Redondeo a un decimal, el que usan los gramos de macro en toda la app. */
export function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/** Suma los macros de los alimentos que tengan cantidad y dato disponibles. */
export function sumarPorGramos(alimentos: AlimentoConCantidad[]): Macros {
  let cal = 0;
  let prot = 0;
  let carb = 0;
  let gras = 0;
  let hayCal = false;
  let hayProt = false;
  let hayCarb = false;
  let hayGras = false;

  for (const alimento of alimentos) {
    const gramos = alimento.cantidadGramos;
    if (gramos == null || gramos <= 0) continue;
    const factor = gramos / 100;
    if (alimento.caloriasPor100 != null) {
      cal += alimento.caloriasPor100 * factor;
      hayCal = true;
    }
    if (alimento.proteinasPor100 != null) {
      prot += alimento.proteinasPor100 * factor;
      hayProt = true;
    }
    if (alimento.carbohidratosPor100 != null) {
      carb += alimento.carbohidratosPor100 * factor;
      hayCarb = true;
    }
    if (alimento.grasasPor100 != null) {
      gras += alimento.grasasPor100 * factor;
      hayGras = true;
    }
  }

  return {
    calorias: hayCal ? Math.round(cal) : null,
    proteinasG: hayProt ? redondear1(prot) : null,
    carbohidratosG: hayCarb ? redondear1(carb) : null,
    grasasG: hayGras ? redondear1(gras) : null,
  };
}

/** Multiplica cada macro conocida por un factor (porciones, mitad de plato…). */
export function escalarMacros(macros: Macros, factor: number): Macros {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return {
    calorias: macros.calorias != null ? Math.round(macros.calorias * f) : null,
    proteinasG:
      macros.proteinasG != null ? redondear1(macros.proteinasG * f) : null,
    carbohidratosG:
      macros.carbohidratosG != null
        ? redondear1(macros.carbohidratosG * f)
        : null,
    grasasG: macros.grasasG != null ? redondear1(macros.grasasG * f) : null,
  };
}

/** Divide cada macro conocida (los macros por porción de una receta). */
export function dividirMacros(macros: Macros, divisor: number | null): Macros {
  const d = divisor != null && divisor > 0 ? divisor : 1;
  return escalarMacros(macros, 1 / d);
}

/**
 * Suma dos juegos de macros columna por columna.
 *
 * `null + null` es `null` (nadie aportó el dato) pero `null + 120` es `120`:
 * que a una comida le falte el dato de proteínas no puede borrar las del resto
 * del día.
 */
export function sumarMacros(a: Macros, b: Macros): Macros {
  return {
    calorias: sumarValor(a.calorias, b.calorias, Math.round),
    proteinasG: sumarValor(a.proteinasG, b.proteinasG, redondear1),
    carbohidratosG: sumarValor(a.carbohidratosG, b.carbohidratosG, redondear1),
    grasasG: sumarValor(a.grasasG, b.grasasG, redondear1),
  };
}

/** Suma varios juegos de macros (el total de una comida, de un día). */
export function sumarTodos(macros: Macros[]): Macros {
  return macros.reduce(sumarMacros, MACROS_VACIOS);
}

/** ¿Hay al menos una macro con dato? */
export function hayMacros(macros: Macros): boolean {
  return (
    macros.calorias != null ||
    macros.proteinasG != null ||
    macros.carbohidratosG != null ||
    macros.grasasG != null
  );
}

function sumarValor(
  a: number | null,
  b: number | null,
  redondeo: (valor: number) => number,
): number | null {
  if (a == null && b == null) return null;
  return redondeo((a ?? 0) + (b ?? 0));
}

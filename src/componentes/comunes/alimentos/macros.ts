/**
 * Cálculo de macros de una lista de alimentos cargada en un FORMULARIO.
 *
 * Es un ESPEJO del cálculo que hace el dominio al guardar
 * (`dominio/servicios/macrosAlimentos`): la pantalla lo necesita para mostrar
 * los totales mientras se escribe, sin ir al servidor por cada tecla, y la
 * presentación no puede importar funciones del dominio. Que sean dos
 * implementaciones de la misma regla es deuda conocida; tenerlas las dos en un
 * módulo propio al menos las deja testeables y a la vista.
 *
 * Vive en `comunes/` porque lo usan el recetario y los planes semanales: las
 * dos pantallas cargan alimentos con el mismo buscador y la misma cuenta, y
 * con dos copias eso dura hasta el primer arreglo que se aplique en una sola.
 *
 * Los valores se guardan como texto (los inputs pueden estar vacíos), así que
 * todo pasa por `aNumero` antes de sumarse.
 */

/**
 * Un alimento tal como lo tiene el formulario: los números, como texto.
 *
 * Es estructural a propósito —el ingrediente de una receta y el item de una
 * comida del plan semanal lo cumplen sin declararlo— para que este módulo no
 * dependa del esquema de ninguna de las dos pantallas.
 */
export interface AlimentoEnFormulario {
  cantidadGramos: string;
  caloriasPor100: string;
  proteinasPor100: string;
  carbohidratosPor100: string;
  grasasPor100: string;
}

export function aNumero(valor: string | null | undefined): number | null {
  if (valor == null) return null;
  const texto = String(valor).trim();
  if (texto === "") return null;
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

export interface Macros {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
}

/** Suma los macros de los alimentos con cantidad y datos (espejo del dominio). */
export function calcularTotales(ingredientes: AlimentoEnFormulario[]): Macros {
  let cal = 0;
  let prot = 0;
  let carb = 0;
  let gras = 0;
  let hayCal = false;
  let hayProt = false;
  let hayCarb = false;
  let hayGras = false;
  for (const ing of ingredientes) {
    const gramos = aNumero(ing.cantidadGramos);
    if (gramos == null || gramos <= 0) continue;
    const factor = gramos / 100;
    const c = aNumero(ing.caloriasPor100);
    const p = aNumero(ing.proteinasPor100);
    const h = aNumero(ing.carbohidratosPor100);
    const g = aNumero(ing.grasasPor100);
    if (c != null) {
      cal += c * factor;
      hayCal = true;
    }
    if (p != null) {
      prot += p * factor;
      hayProt = true;
    }
    if (h != null) {
      carb += h * factor;
      hayCarb = true;
    }
    if (g != null) {
      gras += g * factor;
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

export function porPorcion(m: Macros, porciones: number | null): Macros {
  const p = porciones != null && porciones > 0 ? porciones : 1;
  return {
    calorias: m.calorias != null ? Math.round(m.calorias / p) : null,
    proteinasG: m.proteinasG != null ? redondear1(m.proteinasG / p) : null,
    carbohidratosG:
      m.carbohidratosG != null ? redondear1(m.carbohidratosG / p) : null,
    grasasG: m.grasasG != null ? redondear1(m.grasasG / p) : null,
  };
}

export function hayMacros(m: Macros): boolean {
  return (
    m.calorias != null ||
    m.proteinasG != null ||
    m.carbohidratosG != null ||
    m.grasasG != null
  );
}

/**
 * Suma dos juegos de macros columna por columna.
 *
 * `null + null` es `null` (nadie aportó el dato) pero `null + 120` es `120`:
 * que a una comida le falte el dato de proteínas no puede borrar las del resto
 * del día. Espejo de `sumarMacros` del dominio.
 */
export function sumarMacros(a: Macros, b: Macros): Macros {
  return {
    calorias: sumarValor(a.calorias, b.calorias, Math.round),
    proteinasG: sumarValor(a.proteinasG, b.proteinasG, redondear1),
    carbohidratosG: sumarValor(a.carbohidratosG, b.carbohidratosG, redondear1),
    grasasG: sumarValor(a.grasasG, b.grasasG, redondear1),
  };
}

/** Multiplica cada macro conocida por un factor (las porciones de una receta). */
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

/** Ninguna macro conocida. */
export const MACROS_VACIOS: Macros = {
  calorias: null,
  proteinasG: null,
  carbohidratosG: null,
  grasasG: null,
};

function sumarValor(
  a: number | null,
  b: number | null,
  redondeo: (valor: number) => number,
): number | null {
  if (a == null && b == null) return null;
  return redondeo((a ?? 0) + (b ?? 0));
}

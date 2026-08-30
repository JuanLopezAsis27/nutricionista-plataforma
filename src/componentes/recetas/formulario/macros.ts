import type { IngredienteFormulario } from "./esquema";

/**
 * Cálculo de macros de una receta a partir de sus ingredientes.
 *
 * Es un ESPEJO del cálculo que hace el dominio al guardar: la pantalla lo
 * necesita para mostrar los totales mientras se escribe, sin ir al servidor
 * por cada tecla. Que sean dos implementaciones de la misma regla es deuda
 * conocida; extraerlo del componente al menos la deja testeable y a la vista.
 *
 * Los valores se guardan como texto (los inputs pueden estar vacíos), así que
 * todo pasa por `aNumero` antes de sumarse.
 */

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

/** Suma los macros de los ingredientes con cantidad y datos (espejo del dominio). */
export function calcularTotales(ingredientes: IngredienteFormulario[]): Macros {
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

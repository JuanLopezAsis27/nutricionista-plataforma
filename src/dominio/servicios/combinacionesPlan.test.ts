import { describe, it, expect } from "vitest";
import {
  mejoresCombinaciones,
  puntuar,
  LIMITE_EXHAUSTIVO,
  type FranjaEvaluable,
} from "./combinacionesPlan";
import type { Macros } from "./macrosAlimentos";
import type { MetasDiarias } from "./comparacionMacros";

/**
 * Tests de la búsqueda de las mejores combinaciones de un plan.
 *
 * Lo que fijan: que un día es UNA opción por franja (nunca la suma de las
 * alternativas), que el orden respeta el tipo de cada meta, y que la mejor
 * combinación es la que cumple más aunque otra clave una macro sola.
 */

const m = (
  calorias: number | null,
  proteinasG: number | null = null,
  carbohidratosG: number | null = null,
  grasasG: number | null = null,
): Macros => ({ calorias, proteinasG, carbohidratosG, grasasG });

const soloCalorias = (calorias: number): MetasDiarias => ({
  calorias,
  proteinasG: null,
  carbohidratosG: null,
  grasasG: null,
});

const franja = (nombre: string, ...kcal: number[]): FranjaEvaluable => ({
  nombre,
  opciones: kcal.map((c, i) => ({ numero: i + 1, macros: m(c) })),
});

describe("mejoresCombinaciones", () => {
  it("cuenta los días posibles: una opción por franja", () => {
    const resultado = mejoresCombinaciones(
      [franja("Desayuno", 300, 400), franja("Almuerzo", 600, 700, 800)],
      soloCalorias(1000),
    );
    expect(resultado.total).toBe(6);
    expect(resultado.exhaustivo).toBe(true);
  });

  it("devuelve las tres mejores, la primera la más cercana a la meta", () => {
    const resultado = mejoresCombinaciones(
      [franja("Desayuno", 300, 400), franja("Almuerzo", 600, 700, 800)],
      soloCalorias(1000),
    );
    expect(resultado.mejores).toHaveLength(3);
    // 300+700 y 400+600 clavan 1000; el desempate es la que apareció antes.
    expect(resultado.mejores[0]!.macros.calorias).toBe(1000);
    expect(resultado.mejores[0]!.elecciones).toEqual([
      { franja: "Desayuno", opcion: 1 },
      { franja: "Almuerzo", opcion: 2 },
    ]);
    expect(resultado.mejores[1]!.macros.calorias).toBe(1000);
    expect(resultado.mejores[0]!.comparacion.calorias.estado).toBe("EN_RANGO");
  });

  it("nunca suma las alternativas de una franja entre sí", () => {
    const resultado = mejoresCombinaciones(
      [franja("Almuerzo", 500, 500, 500)],
      soloCalorias(1500),
    );
    // Con tres almuerzos de 500 el día NO llega a 1500: se come uno.
    for (const combinacion of resultado.mejores) {
      expect(combinacion.macros.calorias).toBe(500);
    }
  });

  it("sin metas no ordena nada, pero informa cuántos días hay", () => {
    const resultado = mejoresCombinaciones(
      [franja("Desayuno", 300, 400)],
      null,
    );
    expect(resultado.total).toBe(2);
    expect(resultado.metasCargadas).toBe(0);
    expect(resultado.mejores).toEqual([]);
  });

  it("ignora una franja sin opciones en vez de dejar el plan en cero días", () => {
    const resultado = mejoresCombinaciones(
      [franja("Desayuno", 300), { nombre: "Colación", opciones: [] }],
      soloCalorias(300),
    );
    expect(resultado.total).toBe(1);
    expect(resultado.mejores[0]!.elecciones).toEqual([
      { franja: "Desayuno", opcion: 1 },
    ]);
  });

  it("prefiere la que cumple todas las metas a la que clava una sola", () => {
    const metas: MetasDiarias = {
      calorias: 2000,
      proteinasG: 120,
      carbohidratosG: null,
      grasasG: null,
    };
    const resultado = mejoresCombinaciones(
      [
        {
          nombre: "Día",
          opciones: [
            // Clava las calorías y se queda muy corta de proteína.
            { numero: 1, macros: m(2000, 40) },
            // Un poco corrida en calorías (dentro del ±10 %) y cumple proteína.
            { numero: 2, macros: m(2150, 118) },
          ],
        },
      ],
      metas,
    );
    expect(resultado.mejores[0]!.elecciones[0]!.opcion).toBe(2);
    expect(resultado.mejores[0]!.metasCumplidas).toBe(2);
    expect(resultado.mejores[1]!.metasCumplidas).toBe(1);
  });

  it("una meta MÍNIMA se cumple pasándose, una MÁXIMA quedándose corto", () => {
    const metas: MetasDiarias = {
      calorias: null,
      proteinasG: 120,
      carbohidratosG: null,
      grasasG: 60,
      tipos: { proteinasG: "MINIMO", grasasG: "MAXIMO" },
    };
    const resultado = mejoresCombinaciones(
      [
        {
          nombre: "Día",
          opciones: [
            { numero: 1, macros: m(null, 110, null, 50) },
            { numero: 2, macros: m(null, 150, null, 45) },
            { numero: 3, macros: m(null, 130, null, 70) },
          ],
        },
      ],
      metas,
    );
    const mejor = resultado.mejores[0]!;
    expect(mejor.elecciones[0]!.opcion).toBe(2);
    expect(mejor.comparacion.proteinasG.estado).toBe("EN_RANGO");
    expect(mejor.comparacion.proteinasG.tipo).toBe("MINIMO");
    expect(mejor.comparacion.grasasG.estado).toBe("EN_RANGO");
    expect(mejor.metasCumplidas).toBe(2);
  });

  it("una macro con meta y sin dato cuenta como incumplida", () => {
    const metas: MetasDiarias = {
      calorias: 1000,
      proteinasG: 50,
      carbohidratosG: null,
      grasasG: null,
    };
    expect(puntuar(m(1000, null), metas)).toBeGreaterThan(
      puntuar(m(1000, 50), metas),
    );
  });

  it("un plan demasiado grande se busca por aproximación y lo dice", () => {
    // 8 franjas × 5 opciones = 390.625 días: más que el límite exhaustivo.
    const franjas = Array.from({ length: 8 }, (_, i) =>
      franja(`F${i}`, 100, 200, 250, 300, 400),
    );
    const resultado = mejoresCombinaciones(franjas, soloCalorias(2000));
    expect(resultado.total).toBeGreaterThan(LIMITE_EXHAUSTIVO);
    expect(resultado.exhaustivo).toBe(false);
    expect(resultado.mejores).toHaveLength(3);
    // 8 × 250 = 2000: la aproximación tiene que encontrar un día que cumpla.
    expect(resultado.mejores[0]!.comparacion.calorias.estado).toBe("EN_RANGO");
  });
});

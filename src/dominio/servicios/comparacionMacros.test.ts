import { describe, it, expect } from "vitest";
import { compararConMetas, TOLERANCIA_META } from "./comparacionMacros";

/**
 * Tests de la comparación del día contra las metas del paciente.
 *
 * Lo que fijan es la diferencia entre los cuatro estados, que es lo que la
 * pantalla convierte en semáforo: sin meta cargada, sin datos en el menú, y
 * dentro o fuera del margen. Colapsar los dos primeros haría que un plan al
 * que le faltan macros se viera igual que uno que cumple.
 */

const metas = {
  calorias: 2000,
  proteinasG: 120,
  carbohidratosG: null,
  grasasG: 60,
};

describe("compararConMetas", () => {
  it("marca EN_RANGO dentro del ±10 % de la meta", () => {
    const macros = {
      calorias: 2000 * (1 + TOLERANCIA_META),
      proteinasG: 120,
      carbohidratosG: 200,
      grasasG: 60,
    };
    const comparacion = compararConMetas(macros, metas);
    expect(comparacion.calorias.estado).toBe("EN_RANGO");
    expect(comparacion.proteinasG.estado).toBe("EN_RANGO");
  });

  it("marca POR_DEBAJO y POR_ENCIMA fuera del margen", () => {
    const comparacion = compararConMetas(
      {
        calorias: 1500,
        proteinasG: 200,
        carbohidratosG: 100,
        grasasG: 60,
      },
      metas,
    );
    expect(comparacion.calorias.estado).toBe("POR_DEBAJO");
    expect(comparacion.calorias.diferencia).toBe(-500);
    expect(comparacion.proteinasG.estado).toBe("POR_ENCIMA");
    expect(comparacion.proteinasG.diferencia).toBe(80);
  });

  it("distingue «no hay meta» de «el menú no tiene el dato»", () => {
    const comparacion = compararConMetas(
      { calorias: null, proteinasG: 120, carbohidratosG: 180, grasasG: 60 },
      metas,
    );
    // Las calorías del día no se pueden calcular: falta el dato en el menú.
    expect(comparacion.calorias.estado).toBe("SIN_DATO");
    // El plan del paciente no fija carbohidratos: no hay contra qué comparar.
    expect(comparacion.carbohidratosG.estado).toBe("SIN_META");
  });

  it("sin metas, todo queda en SIN_META", () => {
    const comparacion = compararConMetas(
      { calorias: 1800, proteinasG: 100, carbohidratosG: 200, grasasG: 50 },
      null,
    );
    expect(comparacion.calorias.estado).toBe("SIN_META");
    expect(comparacion.calorias.valor).toBe(1800);
    expect(comparacion.calorias.diferencia).toBeNull();
  });
});

describe("compararConMetas con tipo de meta (migración 82)", () => {
  const macros = {
    calorias: 2300,
    proteinasG: 150,
    carbohidratosG: 180,
    grasasG: 70,
  };

  it("un MÍNIMO se cumple desde la meta para arriba, sin margen hacia abajo", () => {
    const tipos = { proteinasG: "MINIMO" as const };
    const metas = { ...metasBase(), proteinasG: 120, tipos };
    expect(compararConMetas(macros, metas).proteinasG.estado).toBe("EN_RANGO");
    expect(
      compararConMetas({ ...macros, proteinasG: 115 }, metas).proteinasG.estado,
    ).toBe("POR_DEBAJO");
  });

  it("un MÁXIMO se cumple desde la meta para abajo, sin margen hacia arriba", () => {
    const metas = {
      ...metasBase(),
      grasasG: 60,
      tipos: { grasasG: "MAXIMO" as const },
    };
    const comparacion = compararConMetas(macros, metas);
    expect(comparacion.grasasG.estado).toBe("POR_ENCIMA");
    expect(comparacion.grasasG.tipo).toBe("MAXIMO");
    expect(
      compararConMetas({ ...macros, grasasG: 20 }, metas).grasasG.estado,
    ).toBe("EN_RANGO");
  });

  it("sin tipo, la meta se sigue leyendo como aproximada (±10 %)", () => {
    const metas = { ...metasBase(), calorias: 2000 };
    const comparacion = compararConMetas(macros, metas);
    expect(comparacion.calorias.tipo).toBe("APROXIMADO");
    expect(comparacion.calorias.estado).toBe("POR_ENCIMA");
  });
});

function metasBase() {
  return {
    calorias: null,
    proteinasG: null,
    carbohidratosG: null,
    grasasG: null,
  };
}

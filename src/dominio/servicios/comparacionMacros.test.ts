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

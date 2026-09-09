import { describe, it, expect } from "vitest";
import type { DiaComparadoDto } from "@/aplicacion/dtos/planSemanal.dto";
import { promediosDe } from "./ComparativaSemanal";

/**
 * El promedio de la semana toma SOLO los días con dato.
 *
 * Contando los días vacíos como cero, una semana con cuatro días cargados
 * mostraría un promedio muy por debajo de cualquier día real del menú, y el
 * profesional creería que se está quedando corto de calorías cuando lo único
 * que falta es terminar de cargar el fin de semana.
 */

function dia(
  nombre: DiaComparadoDto["dia"],
  calorias: number | null,
): DiaComparadoDto {
  const sinMeta = {
    valor: calorias,
    meta: null,
    diferencia: null,
    estado: "SIN_META" as const,
  };
  return {
    dia: nombre,
    macros: {
      calorias,
      proteinasG: null,
      carbohidratosG: null,
      grasasG: null,
    },
    comparacion: {
      calorias: sinMeta,
      proteinasG: sinMeta,
      carbohidratosG: sinMeta,
      grasasG: sinMeta,
    },
  };
}

describe("promediosDe", () => {
  it("ignora los días sin dato en vez de contarlos como cero", () => {
    const promedios = promediosDe([
      dia("LUNES", 2000),
      dia("MARTES", 1800),
      dia("MIERCOLES", null),
      dia("JUEVES", null),
    ]);
    expect(promedios.calorias).toBe(1900);
  });

  it("devuelve null cuando ningún día tiene ese macro", () => {
    const promedios = promediosDe([dia("LUNES", 2000)]);
    expect(promedios.proteinasG).toBeNull();
  });

  it("sin días cargados no inventa un promedio", () => {
    expect(promediosDe([]).calorias).toBeNull();
  });
});

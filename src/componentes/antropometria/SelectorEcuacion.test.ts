import { describe, it, expect } from "vitest";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import {
  ecuacionesDeLaSerie,
  ecuacionesElegidas,
  TODAS_LAS_ECUACIONES,
} from "./SelectorEcuacion";

/**
 * Las dos derivaciones que comparten el dashboard del profesional y la vista
 * del paciente. Que sean las MISMAS es el punto: si las dos pantallas
 * calcularan por su cuenta qué ecuaciones hay, una podría ofrecer un filtro
 * que la otra no.
 */
function medicion(metodos: MetodoGrasa[]): MedicionComposicionDto {
  return {
    resultado: {
      grasaPorPliegues: {
        resultados: metodos.map((metodo) => ({ metodo })),
        faltantes: [],
      },
    },
  } as unknown as MedicionComposicionDto;
}

describe("ecuacionesDeLaSerie", () => {
  it("une las de todas las mediciones, sin repetir y en el orden del enum", () => {
    const serie = [
      medicion(["FAULKNER", "YUHASZ_CARTER"]),
      medicion(["DURNIN_WOMERSLEY", "FAULKNER"]),
    ];

    // El orden es el de METODOS_GRASA, no el de aparición: es de donde sale el
    // color de cada ecuación, y tiene que ser el mismo en las dos pantallas.
    expect(ecuacionesDeLaSerie(serie)).toEqual([
      "YUHASZ_CARTER",
      "FAULKNER",
      "DURNIN_WOMERSLEY",
    ]);
  });

  it("una ecuación que ninguna medición resolvió no está", () => {
    expect(ecuacionesDeLaSerie([medicion(["FAULKNER"])])).toEqual(["FAULKNER"]);
  });

  it("sin mediciones no hay ecuaciones", () => {
    expect(ecuacionesDeLaSerie([])).toEqual([]);
  });
});

describe("ecuacionesElegidas", () => {
  const disponibles: MetodoGrasa[] = ["YUHASZ_CARTER", "FAULKNER"];

  it("todas devuelve la lista entera, tal como vino", () => {
    expect(ecuacionesElegidas(TODAS_LAS_ECUACIONES, disponibles)).toEqual(
      disponibles,
    );
  });

  it("una devuelve solo esa", () => {
    expect(ecuacionesElegidas("FAULKNER", disponibles)).toEqual(["FAULKNER"]);
  });

  it("una que no está disponible no se inventa", () => {
    // Pasa al desmarcar la ecuación en Configuración con el filtro puesto en
    // ella: el gráfico tiene que quedar vacío, no dibujar otra.
    expect(ecuacionesElegidas("WITHERS", disponibles)).toEqual([]);
  });
});

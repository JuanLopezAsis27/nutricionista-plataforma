// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { EVOLUCIONES_ANTROPOMETRIA } from "@/dominio/entidades/evolucionesAntropometria";
import {
  DEFINICIONES_EVOLUCION,
  EvolucionMedidas,
  GRUPOS_EVOLUCION,
  evolucionesConDatos,
  puntosDeVariable,
} from "./EvolucionMedidas";
import { TEMAS_COMPOSICION } from "./paleta";

/**
 * Como en `EvolucionGrasa.test.tsx`, el gráfico mide 0px en jsdom: lo que se
 * comprueba es qué paneles aparecen y el texto con el último valor de cada uno.
 */
function medicion(
  fecha: string,
  medidas: Partial<MedicionComposicionDto["medidas"]>,
): MedicionComposicionDto {
  return {
    id: fecha,
    fecha: new Date(`${fecha}T00:00:00.000Z`),
    medidas: {
      pesoKg: 70,
      circCinturaMinima: null,
      pliegueTricipital: null,
      fuerzaPrensionDerecha: null,
      fuerzaPrensionIzquierda: null,
      kgBajadosVsAnterior: null,
      kgBajadosAcumulados: null,
      ...medidas,
    },
    resultado: { indices: {}, fraccionamiento: null },
  } as unknown as MedicionComposicionDto;
}

const SERIE = [
  medicion("2024-03-01", {
    pesoKg: 82.5,
    circCinturaMinima: 94,
    pliegueTricipital: 18,
    fuerzaPrensionDerecha: 30,
  }),
  medicion("2024-05-01", {
    pesoKg: 80.1,
    kgBajadosVsAnterior: 2.4,
    kgBajadosAcumulados: 2.4,
  }),
  medicion("2024-06-01", {
    pesoKg: 78.2,
    circCinturaMinima: 90.5,
    pliegueTricipital: 14.5,
    fuerzaPrensionDerecha: 34,
    kgBajadosVsAnterior: 1.9,
    kgBajadosAcumulados: 4.3,
  }),
];

const TEMA = TEMAS_COMPOSICION.light;

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe("catálogo de evoluciones", () => {
  it("cada id del dominio tiene cómo dibujarse y un grupo en el selector", () => {
    const agrupados = GRUPOS_EVOLUCION.flatMap((g) => g.ids);
    for (const id of EVOLUCIONES_ANTROPOMETRIA) {
      expect(DEFINICIONES_EVOLUCION[id]).toBeDefined();
      expect(agrupados).toContain(id);
    }
    expect(agrupados).toHaveLength(EVOLUCIONES_ANTROPOMETRIA.length);
  });
});

describe("puntosDeVariable", () => {
  it("deja afuera las consultas que no midieron la variable", () => {
    const puntos = puntosDeVariable(
      SERIE,
      DEFINICIONES_EVOLUCION.pliegueTricipital,
    );
    expect(puntos.map((p) => p.pliegueTricipital)).toEqual([18, 14.5]);
  });

  it("los kg bajados acumulados arrancan en 0 en la primera consulta", () => {
    const puntos = puntosDeVariable(
      SERIE,
      DEFINICIONES_EVOLUCION.kgBajadosAcumulados,
    );
    expect(puntos.map((p) => p.kgBajadosAcumulados)).toEqual([0, 2.4, 4.3]);
  });
});

describe("evolucionesConDatos", () => {
  it("solo cuenta las que tienen dos consultas o más", () => {
    const ids = evolucionesConDatos(SERIE);
    expect(ids.has("pliegueTricipital")).toBe(true);
    expect(ids.has("circCadera")).toBe(false);
  });
});

describe("EvolucionMedidas", () => {
  it("el paciente ve exactamente las evoluciones del consultorio", () => {
    render(
      <EvolucionMedidas
        mediciones={SERIE}
        tema={TEMA}
        evoluciones={["pliegueTricipital", "fuerzaPrension"]}
      />,
    );
    expect(screen.getByText("Pliegue tricipital")).toBeTruthy();
    expect(screen.getByText("14,50 mm")).toBeTruthy();
    expect(screen.getByText("34,00 kg")).toBeTruthy();
    // El peso tiene datos, pero el consultorio no lo eligió.
    expect(screen.queryByText("78,20 kg")).toBeNull();
    expect(screen.queryByRole("button", { name: /Elegir medidas/ })).toBeNull();
  });

  it("el profesional arranca en lo del paciente salvo que haya elegido otra cosa", () => {
    window.localStorage.setItem(
      "evolucion-medidas:profesional",
      JSON.stringify(["pesoKg", "idQueYaNoExiste"]),
    );
    render(
      <EvolucionMedidas
        mediciones={SERIE}
        tema={TEMA}
        evoluciones={["pliegueTricipital"]}
        seleccionable
      />,
    );
    expect(screen.getByText("78,20 kg")).toBeTruthy();
    expect(screen.queryByText("14,50 mm")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Ver lo mismo que el paciente" }),
    ).toBeTruthy();
  });
});

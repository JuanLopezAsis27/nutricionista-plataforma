import { describe, it, expect } from "vitest";
import { Bioimpedancia } from "./Bioimpedancia";
import { ObjetivoBioimpedancia } from "./ObjetivoBioimpedancia";
import { ErrorValidacion } from "../errores/ErrorValidacion";

const BASE = {
  pacienteId: "pac-1",
  fecha: new Date("2026-07-01"),
  pesoKg: 80,
};

describe("Bioimpedancia", () => {
  it("solo exige el peso: el resto es lo que informe el equipo", () => {
    const medicion = Bioimpedancia.crear(BASE, "b-1");
    expect(medicion.medidas).toEqual({
      pesoKg: 80,
      masaMuscularKg: null,
      masaGrasaKg: null,
      porcentajeMuscular: null,
      porcentajeGrasa: null,
      nivelGrasaVisceral: null,
    });
  });

  it("la grasa visceral es un nivel: entero y dentro de la escala", () => {
    expect(
      Bioimpedancia.crear({ ...BASE, nivelGrasaVisceral: 9 }, "b-1").medidas
        .nivelGrasaVisceral,
    ).toBe(9);
    expect(() =>
      Bioimpedancia.crear({ ...BASE, nivelGrasaVisceral: 8.5 }, "b-1"),
    ).toThrow(/entero/);
    expect(() =>
      Bioimpedancia.crear({ ...BASE, nivelGrasaVisceral: 0 }, "b-1"),
    ).toThrow("Grasa visceral debe estar entre 1 y 59.");
  });

  it("guarda los porcentajes tal cual, sin recalcularlos desde los kg", () => {
    const medicion = Bioimpedancia.crear(
      { ...BASE, masaGrasaKg: 20, porcentajeGrasa: 26.1 },
      "b-1",
    );
    expect(medicion.medidas.porcentajeGrasa).toBe(26.1);
  });

  it("rechaza un tejido que pese más que el cuerpo entero", () => {
    expect(() =>
      Bioimpedancia.crear({ ...BASE, masaMuscularKg: 85 }, "b-1"),
    ).toThrow(ErrorValidacion);
  });

  it("rechaza porcentajes que juntos pasan del 100 %", () => {
    expect(() =>
      Bioimpedancia.crear(
        { ...BASE, porcentajeMuscular: 60, porcentajeGrasa: 45 },
        "b-1",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("rechaza valores fuera de rango", () => {
    expect(() => Bioimpedancia.crear({ ...BASE, pesoKg: 5 }, "b-1")).toThrow(
      ErrorValidacion,
    );
  });

  it("al actualizar, null borra un valor y undefined lo conserva", () => {
    const medicion = Bioimpedancia.crear(
      { ...BASE, masaGrasaKg: 20, masaMuscularKg: 30 },
      "b-1",
    );
    const actualizada = medicion.actualizar({ masaGrasaKg: null });
    expect(actualizada.medidas.masaGrasaKg).toBeNull();
    expect(actualizada.medidas.masaMuscularKg).toBe(30);
  });

  it("revalida al actualizar", () => {
    const medicion = Bioimpedancia.crear({ ...BASE, masaGrasaKg: 20 }, "b-1");
    expect(() => medicion.actualizar({ pesoKg: 19 })).toThrow(ErrorValidacion);
  });
});

describe("ObjetivoBioimpedancia", () => {
  it("una meta de grasa visceral también es un nivel entero", () => {
    const objetivo = ObjetivoBioimpedancia.crear(
      { pacienteId: "pac-1", variable: "GRASA_VISCERAL", valorObjetivo: 7 },
      "o-1",
    );
    expect(objetivo.descripcion).toBe("Grasa visceral");
    expect(() =>
      ObjetivoBioimpedancia.crear(
        { pacienteId: "pac-1", variable: "GRASA_VISCERAL", valorObjetivo: 6.5 },
        "o-1",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("toma etiqueta y rango de la medida de la que sale", () => {
    const objetivo = ObjetivoBioimpedancia.crear(
      { pacienteId: "pac-1", variable: "PORCENTAJE_GRASA", valorObjetivo: 20 },
      "o-1",
    );
    expect(objetivo.descripcion).toBe("Porcentaje graso");
    expect(() =>
      ObjetivoBioimpedancia.crear(
        {
          pacienteId: "pac-1",
          variable: "PORCENTAJE_GRASA",
          valorObjetivo: 90,
        },
        "o-2",
      ),
    ).toThrow(ErrorValidacion);
  });
});

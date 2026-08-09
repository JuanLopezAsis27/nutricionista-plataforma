import { describe, it, expect } from "vitest";
import { MetricaDispositivo } from "./MetricaDispositivo";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("MetricaDispositivo", () => {
  it("crea una métrica válida (incluir por defecto true)", () => {
    const metrica = MetricaDispositivo.crear(
      {
        pacienteId: "pac-1",
        fecha: new Date("2026-07-10"),
        fuente: "APPLE_WATCH",
        pasos: 8000,
        horasSueno: 7.4,
      },
      "met-1",
    );

    const p = metrica.aPrimitivos();
    expect(p.pasos).toBe(8000);
    expect(p.horasSueno).toBe(7.4);
    expect(p.incluir).toBe(true);
  });

  it("rechaza valores negativos", () => {
    expect(() =>
      MetricaDispositivo.crear(
        { pacienteId: "pac-1", fecha: new Date(), fuente: "MANUAL", pasos: -1 },
        "met-2",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("rechaza horas de sueño fuera de 0–24", () => {
    expect(() =>
      MetricaDispositivo.crear(
        { pacienteId: "pac-1", fecha: new Date(), fuente: "MANUAL", horasSueno: 30 },
        "met-3",
      ),
    ).toThrow(ErrorValidacion);
  });
});

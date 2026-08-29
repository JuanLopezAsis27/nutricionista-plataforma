import { describe, it, expect, vi } from "vitest";
import { ObtenerCalendarioDiario } from "./ObtenerCalendarioDiario";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockRegistroDiarioRepositorio,
  registroDiarioEjemplo,
} from "../_ayudas-test";

describe("ObtenerCalendarioDiario", () => {
  it("devuelve indicadores por día registrado del mes", async () => {
    const registros = mockRegistroDiarioRepositorio({
      listarPorRango: vi.fn(async () => [
        registroDiarioEjemplo({
          fecha: new Date("2026-07-10"),
          pesoKg: 78.5,
          aguaMl: 1500,
        }),
      ]),
    });
    const casoUso = new ObtenerCalendarioDiario(registros);

    const dias = await casoUso.ejecutar("pac-1", 2026, 7);

    expect(registros.listarPorRango).toHaveBeenCalledWith(
      "pac-1",
      new Date(Date.UTC(2026, 6, 1)),
      new Date(Date.UTC(2026, 6, 31)),
    );
    expect(dias).toHaveLength(1);
    expect(dias[0]).toMatchObject({
      tienePeso: true,
      tieneAgua: true,
      tieneSueno: false,
      cantidadComidas: 0,
    });
  });

  it("rechaza meses fuera de rango", async () => {
    const casoUso = new ObtenerCalendarioDiario(
      mockRegistroDiarioRepositorio(),
    );
    await expect(casoUso.ejecutar("pac-1", 2026, 13)).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
  });
});

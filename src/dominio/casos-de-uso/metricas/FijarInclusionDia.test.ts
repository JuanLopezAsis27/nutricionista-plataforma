import { describe, it, expect } from "vitest";
import { FijarInclusionDia } from "./FijarInclusionDia";
import { mockMetricaDispositivoRepositorio } from "../_ayudas-test";

describe("FijarInclusionDia", () => {
  it("delega el opt-in del día en el repositorio", async () => {
    const metricas = mockMetricaDispositivoRepositorio();
    const casoUso = new FijarInclusionDia(metricas);
    const fecha = new Date("2026-07-10");

    await casoUso.ejecutar("pac-1", fecha, false);

    expect(metricas.fijarInclusion).toHaveBeenCalledWith("pac-1", fecha, false);
  });
});

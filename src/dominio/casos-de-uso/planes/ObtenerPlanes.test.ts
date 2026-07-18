import { describe, it, expect, vi } from "vitest";
import { ObtenerPlanes } from "./ObtenerPlanes";
import { mockPlanRepositorio, planEjemplo } from "../_ayudas-test";

describe("ObtenerPlanes", () => {
  it("delega el filtro al repositorio y devuelve la lista", async () => {
    const planes = mockPlanRepositorio({
      listar: vi.fn(async () => [planEjemplo()]),
    });
    const casoUso = new ObtenerPlanes(planes);

    const resultado = await casoUso.ejecutar({ esPlantilla: true });

    expect(resultado).toHaveLength(1);
    expect(planes.listar).toHaveBeenCalledWith({ esPlantilla: true });
  });
});

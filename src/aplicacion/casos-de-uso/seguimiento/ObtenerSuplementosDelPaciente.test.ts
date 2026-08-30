import { describe, it, expect, vi } from "vitest";
import { ObtenerSuplementosDelPaciente } from "./ObtenerSuplementosDelPaciente";
import { mockSuplementoRepositorio, suplementoEjemplo } from "../_ayudas-test";

describe("ObtenerSuplementosDelPaciente", () => {
  it("lista los suplementos delegando el filtro de inactivos", async () => {
    const suplementos = mockSuplementoRepositorio({
      listarPorPaciente: vi.fn(async () => [suplementoEjemplo()]),
    });
    const casoUso = new ObtenerSuplementosDelPaciente(suplementos);

    const resultado = await casoUso.ejecutar("pac-1", true);

    expect(resultado).toHaveLength(1);
    expect(suplementos.listarPorPaciente).toHaveBeenCalledWith("pac-1", true);
  });
});

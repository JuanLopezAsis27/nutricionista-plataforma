import { describe, it, expect, vi } from "vitest";
import { ObtenerMaterialesDelPaciente } from "./ObtenerMaterialesDelPaciente";
import { mockMaterialRepositorio, materialEjemplo } from "../_ayudas-test";

describe("ObtenerMaterialesDelPaciente", () => {
  it("devuelve los materiales compartidos con el paciente", async () => {
    const materiales = mockMaterialRepositorio({
      listarPorPaciente: vi.fn(async () => [materialEjemplo()]),
    });
    const casoUso = new ObtenerMaterialesDelPaciente(materiales);

    const resultado = await casoUso.ejecutar("pac-1");

    expect(resultado).toHaveLength(1);
    expect(materiales.listarPorPaciente).toHaveBeenCalledWith("pac-1");
  });
});

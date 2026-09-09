import { describe, it, expect, vi } from "vitest";
import { ObtenerRecetasDelPaciente } from "./ObtenerRecetasDelPaciente";
import { mockRecetaRepositorio, recetaEjemplo } from "../_ayudas-test";

describe("ObtenerRecetasDelPaciente", () => {
  it("devuelve las recetas compartidas con el paciente", async () => {
    const recetas = mockRecetaRepositorio({
      listarPorPaciente: vi.fn(async () => [recetaEjemplo()]),
    });
    const casoUso = new ObtenerRecetasDelPaciente(recetas);

    const resultado = await casoUso.ejecutar("pac-1");

    expect(resultado).toHaveLength(1);
    expect(recetas.listarPorPaciente).toHaveBeenCalledWith("pac-1");
  });
});

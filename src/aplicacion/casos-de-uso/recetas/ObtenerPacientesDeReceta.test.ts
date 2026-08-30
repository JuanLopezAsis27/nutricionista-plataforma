import { describe, it, expect, vi } from "vitest";
import { ObtenerPacientesDeReceta } from "./ObtenerPacientesDeReceta";
import { mockRecetaRepositorio } from "../_ayudas-test";

describe("ObtenerPacientesDeReceta", () => {
  it("devuelve los ids de pacientes con la receta asignada", async () => {
    const recetas = mockRecetaRepositorio({
      listarPacientesAsignados: vi.fn(async () => ["pac-1", "pac-2"]),
    });
    const casoUso = new ObtenerPacientesDeReceta(recetas);

    const resultado = await casoUso.ejecutar("rec-1");

    expect(resultado).toEqual(["pac-1", "pac-2"]);
    expect(recetas.listarPacientesAsignados).toHaveBeenCalledWith("rec-1");
  });
});

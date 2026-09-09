import { describe, it, expect, vi } from "vitest";
import { ObtenerMateriales } from "./ObtenerMateriales";
import { mockMaterialRepositorio, materialEjemplo } from "../_ayudas-test";

describe("ObtenerMateriales", () => {
  it("delega el filtro al repositorio y devuelve la lista", async () => {
    const materiales = mockMaterialRepositorio({
      listar: vi.fn(async () => [materialEjemplo()]),
    });
    const casoUso = new ObtenerMateriales(materiales);

    const resultado = await casoUso.ejecutar({ categoria: "educación" });

    expect(resultado).toHaveLength(1);
    expect(materiales.listar).toHaveBeenCalledWith({ categoria: "educación" });
  });
});

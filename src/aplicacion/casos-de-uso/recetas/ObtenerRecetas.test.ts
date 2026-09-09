import { describe, it, expect, vi } from "vitest";
import { ObtenerRecetas } from "./ObtenerRecetas";
import { mockRecetaRepositorio, recetaEjemplo } from "../_ayudas-test";

describe("ObtenerRecetas", () => {
  it("delega el filtro al repositorio y devuelve la lista", async () => {
    const recetas = mockRecetaRepositorio({
      listar: vi.fn(async () => [recetaEjemplo()]),
    });
    const casoUso = new ObtenerRecetas(recetas);

    const resultado = await casoUso.ejecutar({ etiqueta: "vegetariano" });

    expect(resultado).toHaveLength(1);
    expect(recetas.listar).toHaveBeenCalledWith({ etiqueta: "vegetariano" });
  });
});

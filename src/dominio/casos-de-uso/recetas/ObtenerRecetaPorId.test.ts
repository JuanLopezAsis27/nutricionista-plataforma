import { describe, it, expect, vi } from "vitest";
import { ObtenerRecetaPorId } from "./ObtenerRecetaPorId";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";
import { mockRecetaRepositorio, recetaEjemplo } from "../_ayudas-test";

describe("ObtenerRecetaPorId", () => {
  it("devuelve la receta cuando existe", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
    });
    const casoUso = new ObtenerRecetaPorId(recetas);

    const receta = await casoUso.ejecutar("rec-1");
    expect(receta.id).toBe("rec-1");
  });

  it("lanza ErrorRecetaNoEncontrada si no existe", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new ObtenerRecetaPorId(recetas);

    await expect(casoUso.ejecutar("inexistente")).rejects.toBeInstanceOf(
      ErrorRecetaNoEncontrada,
    );
  });
});

import { describe, it, expect, vi } from "vitest";
import { ObtenerRecetasPorIds } from "./ObtenerRecetasPorIds";
import { mockRecetaRepositorio, recetaEjemplo } from "../_ayudas-test";

describe("ObtenerRecetasPorIds", () => {
  it("las pide en UNA consulta y las devuelve en el orden pedido", async () => {
    // El repositorio no garantiza el orden; el PDF del plan las imprime en el
    // orden en que aparecen en las franjas.
    const recetas = mockRecetaRepositorio({
      obtenerPorIds: vi.fn(async () => [
        recetaEjemplo({}, "rec-2"),
        recetaEjemplo({}, "rec-1"),
      ]),
    });
    const casoUso = new ObtenerRecetasPorIds(recetas);

    const resultado = await casoUso.ejecutar(["rec-1", "rec-2", "rec-1"]);

    expect(resultado.map((r) => r.id)).toEqual(["rec-1", "rec-2"]);
    expect(recetas.obtenerPorIds).toHaveBeenCalledTimes(1);
    expect(recetas.obtenerPorIds).toHaveBeenCalledWith(["rec-1", "rec-2"]);
  });

  it("omite sin error las que ya no existen", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorIds: vi.fn(async () => [recetaEjemplo({}, "rec-1")]),
    });

    const resultado = await new ObtenerRecetasPorIds(recetas).ejecutar([
      "rec-1",
      "borrada",
    ]);

    expect(resultado.map((r) => r.id)).toEqual(["rec-1"]);
  });

  it("no consulta si no se pidió ninguna", async () => {
    const recetas = mockRecetaRepositorio();

    expect(await new ObtenerRecetasPorIds(recetas).ejecutar([])).toEqual([]);
    expect(recetas.obtenerPorIds).not.toHaveBeenCalled();
  });
});

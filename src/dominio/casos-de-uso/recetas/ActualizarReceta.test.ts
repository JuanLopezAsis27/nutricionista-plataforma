import { describe, it, expect, vi } from "vitest";
import { ActualizarReceta } from "./ActualizarReceta";
import { Receta } from "../../entidades/Receta";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";
import { mockRecetaRepositorio, recetaEjemplo } from "../_ayudas-test";

describe("ActualizarReceta", () => {
  it("actualiza los datos y vincula las fotos nuevas", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
      actualizar: vi.fn(async (r: Receta) => r),
    });
    const casoUso = new ActualizarReceta(recetas);

    const receta = await casoUso.ejecutar({
      id: "rec-1",
      nombre: "Tortilla renovada",
      fotoIdsNuevos: ["arc-9"],
    });

    expect(receta.nombre).toBe("Tortilla renovada");
    expect(recetas.actualizar).toHaveBeenCalledWith(expect.any(Receta), ["arc-9"]);
  });

  it("lanza ErrorRecetaNoEncontrada si la receta no existe", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new ActualizarReceta(recetas);

    await expect(
      casoUso.ejecutar({ id: "inexistente", nombre: "X" }),
    ).rejects.toBeInstanceOf(ErrorRecetaNoEncontrada);
    expect(recetas.actualizar).not.toHaveBeenCalled();
  });
});

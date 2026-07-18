import { describe, it, expect, vi } from "vitest";
import { CrearReceta } from "./CrearReceta";
import { Receta } from "../../entidades/Receta";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockRecetaRepositorio } from "../_ayudas-test";

describe("CrearReceta", () => {
  it("crea una receta y vincula las fotos ya subidas", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new CrearReceta(recetas);

    const receta = await casoUso.ejecutar({
      nombre: "Bowl de pollo",
      ingredientes: ["pollo", "arroz"],
      fotoIds: ["arc-1", "arc-2"],
    });

    expect(receta).toBeInstanceOf(Receta);
    expect(recetas.crear).toHaveBeenCalledOnce();
    expect(recetas.crear).toHaveBeenCalledWith(expect.any(Receta), ["arc-1", "arc-2"]);
  });

  it("lanza ErrorValidacion si el nombre está vacío", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new CrearReceta(recetas);

    await expect(casoUso.ejecutar({ nombre: "   " })).rejects.toBeInstanceOf(ErrorValidacion);
    expect(recetas.crear).not.toHaveBeenCalled();
  });

  it("descarta ingredientes vacíos al normalizar", async () => {
    const recetas = mockRecetaRepositorio({
      crear: vi.fn(async (r: Receta) => r),
    });
    const casoUso = new CrearReceta(recetas);

    const receta = await casoUso.ejecutar({
      nombre: "Ensalada",
      ingredientes: ["lechuga", "  ", "tomate"],
    });

    expect(receta.aPrimitivos().ingredientes).toEqual(["lechuga", "tomate"]);
  });
});

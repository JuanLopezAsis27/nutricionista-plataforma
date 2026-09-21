import { describe, it, expect, vi } from "vitest";
import { ActualizarReceta } from "./ActualizarReceta";
import { Receta } from "@/dominio/entidades/Receta";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";
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
    // El tercer argumento es el testigo del bloqueo optimista: sin él en la
    // llamada, la edición entra sin guardia y vuelve el lost update.
    expect(recetas.actualizar).toHaveBeenCalledWith(
      expect.any(Receta),
      ["arc-9"],
      undefined,
    );
  });

  it("lleva el testigo de versión hasta el repositorio", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
    });
    const casoUso = new ActualizarReceta(recetas);
    const abiertaEn = new Date("2026-03-01T10:00:00.000Z");

    await casoUso.ejecutar({
      id: "rec-1",
      nombre: "Tortilla renovada",
      actualizadoEn: abiertaEn,
    });

    const [, , esperadoEn] = vi.mocked(recetas.actualizar).mock.calls[0]!;
    expect(esperadoEn).toEqual(abiertaEn);
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

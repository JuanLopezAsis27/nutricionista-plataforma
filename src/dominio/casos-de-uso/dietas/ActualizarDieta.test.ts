import { describe, it, expect, vi } from "vitest";
import { ActualizarDieta } from "./ActualizarDieta";
import { ErrorDietaNoEncontrada } from "../../errores/ErrorDietaNoEncontrada";
import { mockDietaRepositorio, dietaEjemplo } from "../_ayudas-test";

describe("ActualizarDieta", () => {
  it("actualiza una dieta existente preservando el id", async () => {
    const original = dietaEjemplo({}, "die-1");
    const repositorio = mockDietaRepositorio({
      obtenerPorId: vi.fn(async () => original),
    });
    const casoUso = new ActualizarDieta(repositorio);

    const actualizada = await casoUso.ejecutar({
      id: "die-1",
      nombre: "Plan modificado",
      descripcion: "nueva",
      comidas: [{ tipo: "CENA", descripcion: "Sopa", calorias: 200 }],
    });

    expect(actualizada.id).toBe("die-1");
    expect(actualizada.nombre).toBe("Plan modificado");
    expect(actualizada.creadoEn).toEqual(original.creadoEn);
    expect(repositorio.actualizar).toHaveBeenCalledOnce();
  });

  it("lanza ErrorDietaNoEncontrada si la dieta no existe", async () => {
    const repositorio = mockDietaRepositorio();
    const casoUso = new ActualizarDieta(repositorio);

    await expect(
      casoUso.ejecutar({
        id: "x",
        nombre: "N",
        descripcion: null,
        comidas: [{ tipo: "CENA", descripcion: "Sopa", calorias: null }],
      }),
    ).rejects.toBeInstanceOf(ErrorDietaNoEncontrada);
  });
});

import { describe, it, expect, vi } from "vitest";
import { ObtenerDietaPorId } from "./ObtenerDietaPorId";
import { ErrorDietaNoEncontrada } from "../../errores/ErrorDietaNoEncontrada";
import { mockDietaRepositorio, dietaEjemplo } from "../_ayudas-test";

describe("ObtenerDietaPorId", () => {
  it("devuelve la dieta cuando existe", async () => {
    const repositorio = mockDietaRepositorio({
      obtenerPorId: vi.fn(async () => dietaEjemplo({}, "die-1")),
    });
    const casoUso = new ObtenerDietaPorId(repositorio);

    const dieta = await casoUso.ejecutar("die-1");

    expect(dieta.id).toBe("die-1");
  });

  it("lanza ErrorDietaNoEncontrada si no existe", async () => {
    const repositorio = mockDietaRepositorio();
    const casoUso = new ObtenerDietaPorId(repositorio);

    await expect(casoUso.ejecutar("x")).rejects.toBeInstanceOf(ErrorDietaNoEncontrada);
  });
});

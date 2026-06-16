import { describe, it, expect, vi } from "vitest";
import { ObtenerDietas } from "./ObtenerDietas";
import { mockDietaRepositorio, dietaEjemplo } from "../_ayudas-test";

describe("ObtenerDietas", () => {
  it("devuelve todas las dietas del repositorio", async () => {
    const repositorio = mockDietaRepositorio({
      listar: vi.fn(async () => [dietaEjemplo(), dietaEjemplo({}, "die-2")]),
    });
    const casoUso = new ObtenerDietas(repositorio);

    const dietas = await casoUso.ejecutar();

    expect(dietas).toHaveLength(2);
  });
});

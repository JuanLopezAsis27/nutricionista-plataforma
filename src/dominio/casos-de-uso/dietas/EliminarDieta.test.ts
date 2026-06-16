import { describe, it, expect, vi } from "vitest";
import { EliminarDieta } from "./EliminarDieta";
import { ErrorDietaNoEncontrada } from "../../errores/ErrorDietaNoEncontrada";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockDietaRepositorio, dietaEjemplo } from "../_ayudas-test";

describe("EliminarDieta", () => {
  it("elimina una dieta sin asignaciones activas", async () => {
    const repositorio = mockDietaRepositorio({
      obtenerPorId: vi.fn(async () => dietaEjemplo({}, "die-1")),
      contarAsignacionesActivasDeDieta: vi.fn(async () => 0),
    });
    const casoUso = new EliminarDieta(repositorio);

    await casoUso.ejecutar("die-1");

    expect(repositorio.eliminar).toHaveBeenCalledWith("die-1");
  });

  it("lanza ErrorDietaNoEncontrada si no existe", async () => {
    const repositorio = mockDietaRepositorio();
    const casoUso = new EliminarDieta(repositorio);

    await expect(casoUso.ejecutar("x")).rejects.toBeInstanceOf(ErrorDietaNoEncontrada);
  });

  it("lanza ErrorValidacion si la dieta tiene asignaciones activas", async () => {
    const repositorio = mockDietaRepositorio({
      obtenerPorId: vi.fn(async () => dietaEjemplo({}, "die-1")),
      contarAsignacionesActivasDeDieta: vi.fn(async () => 2),
    });
    const casoUso = new EliminarDieta(repositorio);

    await expect(casoUso.ejecutar("die-1")).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repositorio.eliminar).not.toHaveBeenCalled();
  });
});

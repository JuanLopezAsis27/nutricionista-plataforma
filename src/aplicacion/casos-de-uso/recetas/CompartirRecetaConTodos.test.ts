import { describe, it, expect, vi } from "vitest";
import { CompartirRecetaConTodos } from "./CompartirRecetaConTodos";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";
import {
  mockRecetaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  recetaEjemplo,
} from "../_ayudas-test";

describe("CompartirRecetaConTodos", () => {
  it("lo asigna a todos los pacientes vigentes en una sola escritura", async () => {
    const repositorio = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
      asignarAPacientes: vi.fn(async () => 1),
    });
    const pacientes = mockPacienteRepositorio({
      listar: vi.fn(async () => [
        pacienteEjemplo({}, "pac-1"),
        pacienteEjemplo({}, "pac-2"),
      ]),
    });

    const resultado = await new CompartirRecetaConTodos(
      repositorio,
      pacientes,
    ).ejecutar("rec-1");

    // Sin filtro: el repositorio ya deja afuera a los archivados.
    expect(pacientes.listar).toHaveBeenCalledWith();
    expect(repositorio.asignarAPacientes).toHaveBeenCalledWith("rec-1", [
      "pac-1",
      "pac-2",
    ]);
    expect(resultado).toEqual({ nuevos: 1, pacientes: 2 });
  });

  it("lanza ErrorRecetaNoEncontrada si no existe", async () => {
    const repositorio = mockRecetaRepositorio();
    const casoUso = new CompartirRecetaConTodos(
      repositorio,
      mockPacienteRepositorio(),
    );

    await expect(casoUso.ejecutar("rec-1")).rejects.toBeInstanceOf(
      ErrorRecetaNoEncontrada,
    );
    expect(repositorio.asignarAPacientes).not.toHaveBeenCalled();
  });
});

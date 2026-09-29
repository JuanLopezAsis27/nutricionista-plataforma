import { describe, it, expect, vi } from "vitest";
import { CompartirMaterialConTodos } from "./CompartirMaterialConTodos";
import { ErrorMaterialNoEncontrado } from "@/dominio/errores/ErrorMaterialNoEncontrado";
import {
  mockMaterialRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  materialEjemplo,
} from "../_ayudas-test";

describe("CompartirMaterialConTodos", () => {
  it("lo asigna a todos los pacientes vigentes en una sola escritura", async () => {
    const repositorio = mockMaterialRepositorio({
      obtenerPorId: vi.fn(async () => materialEjemplo()),
      asignarAPacientes: vi.fn(async () => 1),
    });
    const pacientes = mockPacienteRepositorio({
      listar: vi.fn(async () => [
        pacienteEjemplo({}, "pac-1"),
        pacienteEjemplo({}, "pac-2"),
      ]),
    });

    const resultado = await new CompartirMaterialConTodos(
      repositorio,
      pacientes,
    ).ejecutar("mat-1");

    // Sin filtro: el repositorio ya deja afuera a los archivados.
    expect(pacientes.listar).toHaveBeenCalledWith();
    expect(repositorio.asignarAPacientes).toHaveBeenCalledWith("mat-1", [
      "pac-1",
      "pac-2",
    ]);
    expect(resultado).toEqual({ nuevos: 1, pacientes: 2 });
  });

  it("lanza ErrorMaterialNoEncontrado si no existe", async () => {
    const repositorio = mockMaterialRepositorio();
    const casoUso = new CompartirMaterialConTodos(
      repositorio,
      mockPacienteRepositorio(),
    );

    await expect(casoUso.ejecutar("mat-1")).rejects.toBeInstanceOf(
      ErrorMaterialNoEncontrado,
    );
    expect(repositorio.asignarAPacientes).not.toHaveBeenCalled();
  });
});

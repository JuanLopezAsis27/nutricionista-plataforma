import { describe, it, expect, vi } from "vitest";
import { EliminarPaciente } from "./EliminarPaciente";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("EliminarPaciente", () => {
  it("elimina la cuenta y la ficha de un paciente existente", async () => {
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const usuarios = mockUsuarioRepositorio();
    const casoUso = new EliminarPaciente(repositorio, usuarios);

    await casoUso.ejecutar("pac-1");

    expect(usuarios.eliminarPorPacienteId).toHaveBeenCalledWith("pac-1");
    expect(repositorio.eliminar).toHaveBeenCalledWith("pac-1");
  });

  it("lanza ErrorPacienteNoEncontrado y no elimina si no existe", async () => {
    const repositorio = mockPacienteRepositorio();
    const usuarios = mockUsuarioRepositorio();
    const casoUso = new EliminarPaciente(repositorio, usuarios);

    await expect(casoUso.ejecutar("x")).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
    expect(repositorio.eliminar).not.toHaveBeenCalled();
    expect(usuarios.eliminarPorPacienteId).not.toHaveBeenCalled();
  });
});

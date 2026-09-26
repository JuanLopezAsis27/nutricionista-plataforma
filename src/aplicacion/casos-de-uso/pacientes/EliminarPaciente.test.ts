import { describe, it, expect, vi } from "vitest";
import { EliminarPaciente } from "./EliminarPaciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  pacienteEjemplo,
  usuarioEjemplo,
} from "../_ayudas-test";

const cuenta = usuarioEjemplo({ rol: "PACIENTE" }, "usr-1");

function armar(fichasDeLaCuenta: number) {
  const repositorio = mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
  });
  const usuarios = mockUsuarioRepositorio({
    obtenerPorPacienteId: vi.fn(async () => cuenta),
  });
  const caso = new EliminarPaciente(
    repositorio,
    usuarios,
    mockCuentaPacienteRepositorio({
      contarDeUsuario: vi.fn(async () => fichasDeLaCuenta),
    }),
  );
  return { caso, repositorio, usuarios };
}

describe("EliminarPaciente", () => {
  it("con la cuenta solo de este consultorio, borra la cuenta y la ficha", async () => {
    const { caso, repositorio, usuarios } = armar(1);

    await caso.ejecutar("pac-1");

    expect(usuarios.eliminar).toHaveBeenCalledWith("usr-1");
    expect(repositorio.eliminar).toHaveBeenCalledWith("pac-1");
  });

  it("con la cuenta compartida, borra la ficha y la cuenta queda para el otro consultorio", async () => {
    const { caso, repositorio, usuarios } = armar(2);

    await caso.ejecutar("pac-1");

    expect(usuarios.eliminar).not.toHaveBeenCalled();
    expect(repositorio.eliminar).toHaveBeenCalledWith("pac-1");
  });

  it("lanza ErrorPacienteNoEncontrado y no elimina si no existe", async () => {
    const repositorio = mockPacienteRepositorio();
    const usuarios = mockUsuarioRepositorio();
    const casoUso = new EliminarPaciente(
      repositorio,
      usuarios,
      mockCuentaPacienteRepositorio(),
    );

    await expect(casoUso.ejecutar("x")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
    expect(repositorio.eliminar).not.toHaveBeenCalled();
    expect(usuarios.eliminar).not.toHaveBeenCalled();
  });
});

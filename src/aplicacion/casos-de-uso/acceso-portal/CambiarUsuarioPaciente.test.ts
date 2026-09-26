import { describe, it, expect, vi } from "vitest";
import { CambiarUsuarioPaciente } from "./CambiarUsuarioPaciente";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  usuarioEjemplo,
} from "../_ayudas-test";

function armar({
  cuenta = usuarioEjemplo({
    rol: "PACIENTE",
    email: null,
    nombreUsuario: "juan.perez",
  }),
  fichas = 1,
  tomado = false,
}: {
  cuenta?: ReturnType<typeof usuarioEjemplo>;
  fichas?: number;
  tomado?: boolean;
} = {}) {
  const usuarios = mockUsuarioRepositorio({
    obtenerPorPacienteId: vi.fn(async () => cuenta),
    nombreUsuarioYaRegistrado: vi.fn(async () => tomado),
  });
  return {
    caso: new CambiarUsuarioPaciente(
      usuarios,
      mockCuentaPacienteRepositorio({
        contarDeUsuario: vi.fn(async () => fichas),
      }),
    ),
    usuarios,
  };
}

describe("CambiarUsuarioPaciente", () => {
  it("cambia el usuario de una cuenta exclusiva", async () => {
    const { caso } = armar();

    const { identificador } = await caso.ejecutar({
      pacienteId: "pac-1",
      nombreUsuario: "Juan.P",
    });

    expect(identificador).toBe("juan.p");
  });

  it("no toca una cuenta compartida con otro consultorio", async () => {
    const { caso, usuarios } = armar({ fichas: 2 });

    await expect(
      caso.ejecutar({ pacienteId: "pac-1", nombreUsuario: "otro.nombre" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("no saca el usuario de una cuenta sin email", async () => {
    const { caso } = armar();

    await expect(
      caso.ejecutar({ pacienteId: "pac-1", nombreUsuario: null }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("con email, el usuario se puede sacar", async () => {
    const { caso } = armar({
      cuenta: usuarioEjemplo({
        rol: "PACIENTE",
        email: "ana@mail.com",
        nombreUsuario: "ana.g",
      }),
    });

    const { identificador } = await caso.ejecutar({
      pacienteId: "pac-1",
      nombreUsuario: null,
    });

    expect(identificador).toBe("ana@mail.com");
  });

  it("rechaza un usuario tomado", async () => {
    const { caso } = armar({ tomado: true });

    await expect(
      caso.ejecutar({ pacienteId: "pac-1", nombreUsuario: "tomado" }),
    ).rejects.toThrow(/ya está en uso/);
  });
});

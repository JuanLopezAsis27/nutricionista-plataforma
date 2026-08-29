import { describe, it, expect, vi } from "vitest";
import { ActualizarPaciente } from "./ActualizarPaciente";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  pacienteEjemplo,
  mockConfiguracionRepositorio,
} from "../_ayudas-test";

describe("ActualizarPaciente", () => {
  it("actualiza los datos de un paciente existente", async () => {
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockConfiguracionRepositorio(),
    );

    const actualizado = await casoUso.ejecutar({
      id: "pac-1",
      nombre: "Anita",
    });

    expect(actualizado.nombre).toBe("Anita");
    expect(repositorio.actualizar).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const repositorio = mockPacienteRepositorio();
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockConfiguracionRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ id: "x", nombre: "Z" }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("lanza ErrorValidacion si el nuevo email pertenece a otro paciente", async () => {
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ email: "ana@mail.com" }, "pac-1"),
      ),
      obtenerPorEmail: vi.fn(async () =>
        pacienteEjemplo({ email: "otro@mail.com" }, "pac-2"),
      ),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockConfiguracionRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ id: "pac-1", email: "otro@mail.com" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("sincroniza el email de la cuenta del paciente al cambiarlo", async () => {
    const usuario = (await import("../../entidades/Usuario")).Usuario.crear(
      {
        email: "ana@mail.com",
        passwordHash: "h",
        rol: "PACIENTE",
        pacienteId: "pac-1",
      },
      "usr-1",
    );
    const usuarios = mockUsuarioRepositorio({
      obtenerPorPacienteId: vi.fn(async () => usuario),
    });
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ email: "ana@mail.com" }, "pac-1"),
      ),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      usuarios,
      mockConfiguracionRepositorio(),
    );

    await casoUso.ejecutar({ id: "pac-1", email: "nueva@mail.com" });

    expect(usuarios.actualizar).toHaveBeenCalledOnce();
  });
});

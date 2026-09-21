import { describe, it, expect, vi } from "vitest";
import { ActualizarPaciente } from "./ActualizarPaciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
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

  it("lleva el testigo de versión hasta el repositorio", async () => {
    // El bloqueo optimista se impone en el WHERE del UPDATE, así que lo único
    // que el caso de uso tiene que garantizar es que el testigo LLEGUE. Si se
    // pierde en el camino la escritura entra igual y vuelve el lost update,
    // sin que falle nada.
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockConfiguracionRepositorio(),
    );
    const abiertaEn = new Date("2026-03-01T10:00:00.000Z");

    await casoUso.ejecutar({
      id: "pac-1",
      notas: "algo",
      actualizadoEn: abiertaEn,
    });

    const [, esperadoEn] = vi.mocked(repositorio.actualizar).mock.calls[0]!;
    expect(esperadoEn).toEqual(abiertaEn);
  });

  it("sin testigo escribe igual: las mutaciones de un campo no se frenan", async () => {
    // Archivar o marcar la bienvenida no salen de un formulario y no tienen de
    // dónde sacar el testigo. Exigirlo las rompería a todas.
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockConfiguracionRepositorio(),
    );

    await casoUso.ejecutar({ id: "pac-1", notas: "algo" });

    const [, esperadoEn] = vi.mocked(repositorio.actualizar).mock.calls[0]!;
    expect(esperadoEn).toBeUndefined();
  });

  it("el testigo no se guarda como si fuera un dato del paciente", async () => {
    // `actualizadoEn` entra por el mismo objeto que los campos editables y la
    // entidad lo fija ella misma al actualizar. Colarlo en los cambios haría
    // que la ficha quedara marcada con la fecha en que se ABRIÓ.
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockConfiguracionRepositorio(),
    );
    const abiertaEn = new Date("2020-01-01T00:00:00.000Z");

    const guardado = await casoUso.ejecutar({
      id: "pac-1",
      notas: "algo",
      actualizadoEn: abiertaEn,
    });

    expect(guardado.actualizadoEn).not.toEqual(abiertaEn);
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
    const usuario = (await import("@/dominio/entidades/Usuario")).Usuario.crear(
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

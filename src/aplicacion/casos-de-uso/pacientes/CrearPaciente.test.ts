import { describe, it, expect, vi } from "vitest";
import {
  CrearPaciente,
  type DatosNuevoPacienteConAcceso,
} from "./CrearPaciente";
import { Paciente } from "@/dominio/entidades/Paciente";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockHasheador,
  pacienteEjemplo,
  mockConfiguracionRepositorio,
} from "../_ayudas-test";

const datos: DatosNuevoPacienteConAcceso = {
  nombre: "Ana",
  apellido: "García",
  email: "ana@mail.com",
  telefono: null,
  fechaNacimiento: null,
  notas: null,
  password: "secreta123",
};

describe("CrearPaciente", () => {
  it("crea el paciente y su cuenta de usuario cuando el email es único", async () => {
    const repositorio = mockPacienteRepositorio();
    const usuarios = mockUsuarioRepositorio();
    const hasheador = mockHasheador();
    const casoUso = new CrearPaciente(
      repositorio,
      usuarios,
      hasheador,
      mockConfiguracionRepositorio(),
    );

    const paciente = await casoUso.ejecutar(datos);

    expect(paciente).toBeInstanceOf(Paciente);
    expect(repositorio.crear).toHaveBeenCalledOnce();
    expect(hasheador.hashear).toHaveBeenCalledWith("secreta123");
    expect(usuarios.crear).toHaveBeenCalledOnce();
  });

  it("lanza ErrorValidacion si ya existe un paciente con ese email", async () => {
    const repositorio = mockPacienteRepositorio({
      obtenerPorEmail: vi.fn(async () => pacienteEjemplo({}, "existente")),
    });
    const usuarios = mockUsuarioRepositorio();
    const casoUso = new CrearPaciente(
      repositorio,
      usuarios,
      mockHasheador(),
      mockConfiguracionRepositorio(),
    );

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(usuarios.crear).not.toHaveBeenCalled();
  });

  it("compensa eliminando el paciente si falla la creación del usuario", async () => {
    const repositorio = mockPacienteRepositorio();
    const usuarios = mockUsuarioRepositorio({
      crear: vi.fn(async () => {
        throw new Error("fallo al crear usuario");
      }),
    });
    const casoUso = new CrearPaciente(
      repositorio,
      usuarios,
      mockHasheador(),
      mockConfiguracionRepositorio(),
    );

    await expect(casoUso.ejecutar(datos)).rejects.toThrow();
    expect(repositorio.eliminar).toHaveBeenCalledOnce();
  });
});

describe("CrearPaciente — el email ya está en uso", () => {
  function armar(
    usuarios = mockUsuarioRepositorio(),
    pacientes = mockPacienteRepositorio(),
  ) {
    return new CrearPaciente(
      pacientes,
      usuarios,
      mockHasheador(),
      mockConfiguracionRepositorio(),
    );
  }

  it("si ya hay un paciente con ese email, lo nombra", async () => {
    // El mensaje tiene que decir CON QUIÉN choca: sin eso el profesional no
    // sabe si es la misma persona (y tiene que editarla) o un homónimo.
    const caso = armar(
      mockUsuarioRepositorio(),
      mockPacienteRepositorio({
        obtenerPorEmail: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    await expect(caso.ejecutar(datos)).rejects.toThrow(ErrorValidacion);
    await caso.ejecutar(datos).catch((error: Error) => {
      expect(error.message).toContain("ana@mail.com");
      expect(error.message).toContain("editá su ficha");
    });
  });

  it("si el email ya tiene cuenta en OTRO consultorio, lo explica sin delatarlo", async () => {
    // Este era el caso que salía como "Ocurrió un error inesperado":
    // `obtenerPorEmail` lleva el filtro de inquilino y no lo veía, así que el
    // alta seguía y reventaba contra el índice único global de `usuarios`.
    const caso = armar(
      mockUsuarioRepositorio({
        obtenerPorEmail: vi.fn(async () => null), // no es de este consultorio
        emailYaRegistrado: vi.fn(async () => true), // pero existe en la plataforma
      }),
    );

    await caso.ejecutar(datos).catch((error: Error) => {
      expect(error).toBeInstanceOf(ErrorValidacion);
      expect(error.message).toContain("ya tiene una cuenta en la plataforma");
      // Y NO dice de quién es ni de qué consultorio: sería filtrar datos ajenos.
      expect(error.message).not.toMatch(/consultorio de|pertenece a/i);
    });
  });

  it("no crea el paciente si el email global está tomado", async () => {
    const pacientes = mockPacienteRepositorio();
    const caso = armar(
      mockUsuarioRepositorio({ emailYaRegistrado: vi.fn(async () => true) }),
      pacientes,
    );

    await caso.ejecutar(datos).catch(() => {});

    // Se corta ANTES de escribir: si no, habría que compensar borrándolo.
    expect(pacientes.crear).not.toHaveBeenCalled();
  });
});

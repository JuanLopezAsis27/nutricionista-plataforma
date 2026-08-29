import { describe, it, expect, vi } from "vitest";
import {
  CrearPaciente,
  type DatosNuevoPacienteConAcceso,
} from "./CrearPaciente";
import { Paciente } from "../../entidades/Paciente";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
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

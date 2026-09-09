import { describe, it, expect, vi } from "vitest";
import { InterpretarFichaPaciente } from "./InterpretarFichaPaciente";
import { CampoHistoriaClinica } from "@/dominio/entidades/CampoHistoriaClinica";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import type {
  FichaPacienteSugerida,
  IInterpretadorFichaPaciente,
} from "@/dominio/servicios/IInterpretadorFichaPaciente";
import {
  mockArchivoRepositorio,
  mockCampoHistoriaClinicaRepositorio,
  archivoEjemplo,
} from "../_ayudas-test";

const FICHA_VACIA: FichaPacienteSugerida = {
  paciente: {
    nombre: null,
    apellido: null,
    email: null,
    telefono: null,
    fechaNacimiento: null,
    sexo: null,
    notas: null,
  },
  historiaClinica: {},
  camposPersonalizados: [],
  alertas: [],
  antropometria: null,
  laboratorios: [],
};

function mockInterpretador(): IInterpretadorFichaPaciente {
  return { interpretar: vi.fn(async () => FICHA_VACIA) };
}

describe("InterpretarFichaPaciente", () => {
  it("interpreta un archivo huérfano y le pasa los campos del consultorio", async () => {
    const interpretador = mockInterpretador();
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoEjemplo()),
      obtenerDueno: vi.fn(async () => null),
    });
    const campos = mockCampoHistoriaClinicaRepositorio({
      obtenerTodos: vi.fn(async () => [
        CampoHistoriaClinica.crear(
          { nombre: "Suplementos", descripcion: "Marca y dosis" },
          "campo-1",
        ),
      ]),
    });
    const casoUso = new InterpretarFichaPaciente(
      interpretador,
      archivos,
      campos,
    );

    await casoUso.ejecutar({ archivoId: "arch-1" });

    const llamada = vi.mocked(interpretador.interpretar).mock.calls[0];
    expect(llamada?.[1]).toEqual([
      {
        clave: expect.stringMatching(/^suplementos-/),
        etiqueta: "Suplementos",
        descripcion: "Marca y dosis",
      },
    ]);
  });

  it("rechaza un archivo que no existe", async () => {
    const casoUso = new InterpretarFichaPaciente(
      mockInterpretador(),
      mockArchivoRepositorio(),
      mockCampoHistoriaClinicaRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ archivoId: "no-existe" }),
    ).rejects.toBeInstanceOf(ErrorArchivoNoEncontrado);
  });

  it("rechaza un archivo que ya pertenece a otro paciente", async () => {
    // Leer la ficha de una persona para dar de alta a otra sería una fuga de
    // datos clínicos entre fichas del mismo consultorio.
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoEjemplo()),
      obtenerDueno: vi.fn(async () => ({ pacienteId: "otro-paciente" })),
    });
    const casoUso = new InterpretarFichaPaciente(
      mockInterpretador(),
      archivos,
      mockCampoHistoriaClinicaRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ archivoId: "arch-1" }),
    ).rejects.toBeInstanceOf(ErrorArchivoNoEncontrado);
  });

  it("acepta un dueño con todas las FKs en null (huérfano registrado)", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoEjemplo()),
      obtenerDueno: vi.fn(async () => ({ pacienteId: undefined })),
    });
    const casoUso = new InterpretarFichaPaciente(
      mockInterpretador(),
      archivos,
      mockCampoHistoriaClinicaRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ archivoId: "arch-1" }),
    ).resolves.toBeDefined();
  });
});

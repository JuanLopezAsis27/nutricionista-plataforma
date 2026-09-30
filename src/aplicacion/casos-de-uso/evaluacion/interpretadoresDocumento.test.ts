import { describe, it, expect, vi } from "vitest";
import { InterpretarHistoriaClinica } from "./InterpretarHistoriaClinica";
import { InterpretarMediciones } from "./InterpretarMediciones";
import { CampoEvolucion } from "@/dominio/entidades/CampoEvolucion";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import type { DuenoArchivo } from "@/dominio/repositorios/IArchivoRepositorio";
import type {
  IInterpretadorHistoriaClinica,
  LecturaHistoriaClinica,
} from "@/dominio/servicios/IInterpretadorHistoriaClinica";
import type {
  IInterpretadorMediciones,
  MedicionesSugeridas,
} from "@/dominio/servicios/IInterpretadorMediciones";
import {
  mockArchivoRepositorio,
  mockPacienteRepositorio,
  mockCampoEvolucionRepositorio,
  archivoEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

/**
 * Los dos interpretadores que leen un documento YA subido a la ficha. Comparten
 * la regla que importa: solo se lee un archivo de ESE paciente —si no, un id
 * cambiado le hace leer a la IA el documento de otro y precargarlo acá—.
 * Ninguno persiste: devuelven la lectura para que el profesional la revise.
 */

const LECTURA_HC = { historia: {} } as unknown as LecturaHistoriaClinica;
const LECTURA_MEDICIONES = { columnas: [] } as unknown as MedicionesSugeridas;

function armar(
  overrides: {
    paciente?: ReturnType<typeof pacienteEjemplo> | null;
    archivo?: ReturnType<typeof archivoEjemplo> | null;
    dueno?: DuenoArchivo | null;
  } = {},
) {
  const pacientes = mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () =>
      overrides.paciente === undefined ? pacienteEjemplo() : overrides.paciente,
    ),
  });
  const archivos = mockArchivoRepositorio({
    obtenerPorId: vi.fn(async () =>
      overrides.archivo === undefined ? archivoEjemplo() : overrides.archivo,
    ),
    obtenerDueno: vi.fn(async () =>
      overrides.dueno === undefined ? { pacienteId: "pac-1" } : overrides.dueno,
    ),
  });
  const campos = mockCampoEvolucionRepositorio({
    obtenerTodos: vi.fn(async () => [
      CampoEvolucion.crear(
        { nombre: "Pantalla", descripcion: "Horas por día" },
        "c1",
      ),
    ]),
  });
  const interpretadorHC: IInterpretadorHistoriaClinica = {
    interpretar: vi.fn(async () => LECTURA_HC),
  };
  const interpretadorMediciones: IInterpretadorMediciones = {
    interpretar: vi.fn(async () => LECTURA_MEDICIONES),
  };
  return {
    historia: new InterpretarHistoriaClinica(
      interpretadorHC,
      archivos,
      pacientes,
      campos,
    ),
    mediciones: new InterpretarMediciones(
      interpretadorMediciones,
      archivos,
      pacientes,
    ),
    interpretadorHC,
    interpretadorMediciones,
  };
}

const ENTRADA = { pacienteId: "pac-1", archivoId: "arc-1" };

describe.each(["historia", "mediciones"] as const)(
  "Interpretar %s desde un documento",
  (cual) => {
    it("rechaza un archivo de OTRO paciente sin llamar a la IA", async () => {
      const casos = armar({ dueno: { pacienteId: "pac-otro" } });

      await expect(casos[cual].ejecutar(ENTRADA)).rejects.toThrow(
        /no pertenece a este paciente/,
      );
      expect(casos.interpretadorHC.interpretar).not.toHaveBeenCalled();
      expect(casos.interpretadorMediciones.interpretar).not.toHaveBeenCalled();
    });

    it("rechaza un archivo sin dueño o de otro contexto (receta, plan…)", async () => {
      await expect(
        armar({ dueno: null })[cual].ejecutar(ENTRADA),
      ).rejects.toThrow(ErrorValidacion);
      await expect(
        armar({ dueno: { recetaId: "rec-1" } })[cual].ejecutar(ENTRADA),
      ).rejects.toThrow(ErrorValidacion);
    });

    it("rechaza un archivo que no existe", async () => {
      await expect(
        armar({ archivo: null })[cual].ejecutar(ENTRADA),
      ).rejects.toThrow(/El archivo no existe/);
    });

    it("rechaza un paciente que no existe", async () => {
      await expect(
        armar({ paciente: null })[cual].ejecutar(ENTRADA),
      ).rejects.toThrow(ErrorPacienteNoEncontrado);
    });
  },
);

describe("InterpretarHistoriaClinica", () => {
  it("le pasa a la IA el archivo y los campos de evolución del consultorio", async () => {
    const { historia, interpretadorHC } = armar();

    const lectura = await historia.ejecutar(ENTRADA);

    expect(lectura).toBe(LECTURA_HC);
    const [archivo, campos] = vi.mocked(interpretadorHC.interpretar).mock
      .calls[0]!;
    expect(archivo).toEqual({
      clave: expect.any(String),
      mimeType: "application/pdf",
    });
    expect(campos).toEqual([
      {
        clave: expect.stringMatching(/^pantalla-/),
        etiqueta: "Pantalla",
        descripcion: "Horas por día",
      },
    ]);
  });
});

describe("InterpretarMediciones", () => {
  it("devuelve la lectura de la IA tal cual, sin guardar nada", async () => {
    const { mediciones, interpretadorMediciones } = armar();

    expect(await mediciones.ejecutar(ENTRADA)).toBe(LECTURA_MEDICIONES);
    expect(interpretadorMediciones.interpretar).toHaveBeenCalledOnce();
  });
});

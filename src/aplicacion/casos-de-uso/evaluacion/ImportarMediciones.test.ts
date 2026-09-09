import { describe, it, expect, vi } from "vitest";
import { ImportarMediciones } from "./ImportarMediciones";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockAntropometriaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

function pacientes() {
  return mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () => pacienteEjemplo()),
  });
}

const COLUMNA_1 = { fecha: new Date("2024-03-15"), pesoKg: 87.3 };
const COLUMNA_2 = { fecha: new Date("2024-04-12"), pesoKg: 84.7 };

describe("ImportarMediciones", () => {
  it("importa todas las mediciones de la planilla", async () => {
    const antropometrias = mockAntropometriaRepositorio();
    const casoUso = new ImportarMediciones(antropometrias, pacientes());

    const resultado = await casoUso.ejecutar({
      pacienteId: "pac-1",
      mediciones: [COLUMNA_1, COLUMNA_2],
    });

    expect(resultado.registradas).toBe(2);
    expect(antropometrias.crear).toHaveBeenCalledTimes(2);
    expect(resultado.resultados.every((r) => r.estado === "REGISTRADA")).toBe(
      true,
    );
  });

  it("salta la fecha que el paciente ya tenía sin frenar el resto", async () => {
    const antropometrias = mockAntropometriaRepositorio({
      existeEnFecha: vi.fn(
        async (_id: string, fecha: Date) =>
          fecha.getTime() === COLUMNA_1.fecha.getTime(),
      ),
    });
    const casoUso = new ImportarMediciones(antropometrias, pacientes());

    const resultado = await casoUso.ejecutar({
      pacienteId: "pac-1",
      mediciones: [COLUMNA_1, COLUMNA_2],
    });

    expect(resultado.registradas).toBe(1);
    expect(antropometrias.crear).toHaveBeenCalledOnce();
    expect(resultado.resultados).toEqual([
      expect.objectContaining({ estado: "DUPLICADA" }),
      expect.objectContaining({ estado: "REGISTRADA" }),
    ]);
  });

  it("informa la medición inválida y guarda las demás", async () => {
    const antropometrias = mockAntropometriaRepositorio();
    const casoUso = new ImportarMediciones(antropometrias, pacientes());

    const resultado = await casoUso.ejecutar({
      pacienteId: "pac-1",
      mediciones: [
        COLUMNA_1,
        // 900 mm de pliegue: el rango de la entidad es 1–80.
        { ...COLUMNA_2, pliegueTricipital: 900 },
      ],
    });

    expect(resultado.registradas).toBe(1);
    expect(resultado.resultados[1]).toMatchObject({ estado: "RECHAZADA" });
    expect(resultado.resultados[1]?.motivo).toContain("pliegue");
  });

  it("rechaza el lote entero si el paciente no existe", async () => {
    const casoUso = new ImportarMediciones(
      mockAntropometriaRepositorio(),
      mockPacienteRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1", mediciones: [COLUMNA_1] }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("rechaza un lote vacío", async () => {
    const casoUso = new ImportarMediciones(
      mockAntropometriaRepositorio(),
      pacientes(),
    );

    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1", mediciones: [] }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("propaga un fallo de infraestructura en vez de anotarlo como rechazo", async () => {
    const antropometrias = mockAntropometriaRepositorio({
      crear: vi.fn(async () => {
        throw new Error("la base se cayó");
      }),
    });
    const casoUso = new ImportarMediciones(antropometrias, pacientes());

    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1", mediciones: [COLUMNA_1] }),
    ).rejects.toThrow("la base se cayó");
  });
});

import { describe, it, expect, vi } from "vitest";
import { ImportarMediciones } from "./ImportarMediciones";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { REQUERIDOS_CINCO_MASAS } from "@/dominio/entidades/PlantillaAntropometrica";
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

/**
 * Las 21 medidas del fraccionamiento de Kerr, con valores dentro de rango.
 * Se arma desde la lista del dominio para que sumar un requisito allá no deje
 * a este test comprobando un perfil que ya no es completo.
 */
const MEDIDAS_ISAK = Object.fromEntries(
  REQUERIDOS_CINCO_MASAS.map((campo) => [
    campo,
    campo === "tallaCm" ? 170 : campo === "tallaSentadoCm" ? 90 : 30,
  ]),
) as Record<(typeof REQUERIDOS_CINCO_MASAS)[number], number>;

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
    // El motivo nombra la medida como se la ve en la tabla de revisión, no
    // como se llama la columna: es lo que el profesional tiene que ir a buscar.
    expect(resultado.resultados[1]?.motivo).toContain("Pliegue tricipital");
    expect(resultado.resultados[1]?.motivo).not.toContain("pliegueTricipital");
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

  it("deduce el protocolo de cada columna: ISAK completo entra como 5 componentes", async () => {
    // Nadie declara el protocolo por columna —una planilla son años de
    // consultas—, así que lo decide lo que la columna trajo. Antes entraban
    // todas como de 2 componentes, el default de la entidad, y una proforma
    // ISAK importada abría el dashboard en el modelo equivocado.
    const antropometrias = mockAntropometriaRepositorio();
    const casoUso = new ImportarMediciones(antropometrias, pacientes());

    await casoUso.ejecutar({
      pacienteId: "pac-1",
      mediciones: [COLUMNA_1, { ...COLUMNA_2, ...MEDIDAS_ISAK }],
    });

    const guardadas = vi
      .mocked(antropometrias.crear)
      .mock.calls.map(([medicion]) => medicion.protocolo);
    expect(guardadas).toEqual(["DOS_COMPONENTES", "CINCO_COMPONENTES"]);
  });

  it("respeta el protocolo si la columna lo trae declarado", async () => {
    const antropometrias = mockAntropometriaRepositorio();
    const casoUso = new ImportarMediciones(antropometrias, pacientes());

    await casoUso.ejecutar({
      pacienteId: "pac-1",
      mediciones: [{ ...COLUMNA_1, protocolo: "CINCO_COMPONENTES" }],
    });

    const [medicion] = vi.mocked(antropometrias.crear).mock.calls[0]!;
    expect(medicion.protocolo).toBe("CINCO_COMPONENTES");
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

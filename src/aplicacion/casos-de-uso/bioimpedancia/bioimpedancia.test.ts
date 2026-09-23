import { describe, it, expect, vi } from "vitest";
import { Bioimpedancia } from "@/dominio/entidades/Bioimpedancia";
import { ObjetivoBioimpedancia } from "@/dominio/entidades/ObjetivoBioimpedancia";
import type { IBioimpedanciaRepositorio } from "@/dominio/repositorios/IBioimpedanciaRepositorio";
import type { IObjetivoBioimpedanciaRepositorio } from "@/dominio/repositorios/IObjetivoBioimpedanciaRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorBioimpedanciaDuplicada } from "@/dominio/errores/ErrorBioimpedanciaDuplicada";
import { ErrorBioimpedanciaNoEncontrada } from "@/dominio/errores/ErrorBioimpedanciaNoEncontrada";
import { RegistrarBioimpedancia } from "./RegistrarBioimpedancia";
import { ActualizarBioimpedancia } from "./ActualizarBioimpedancia";
import { EliminarBioimpedancia } from "./EliminarBioimpedancia";
import { GuardarObjetivoBioimpedancia } from "./GuardarObjetivoBioimpedancia";
import { ObtenerSeguimientoBioimpedancia } from "./ObtenerSeguimientoBioimpedancia";
import { mockPacienteRepositorio, pacienteEjemplo } from "../_ayudas-test";

function mockBioimpedancias(
  parcial: Partial<IBioimpedanciaRepositorio> = {},
): IBioimpedanciaRepositorio {
  return {
    crear: vi.fn(async (m: Bioimpedancia) => m),
    actualizar: vi.fn(async (m: Bioimpedancia) => m),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    existeEnFecha: vi.fn(async () => false),
    ...parcial,
  };
}

function mockObjetivos(
  parcial: Partial<IObjetivoBioimpedanciaRepositorio> = {},
): IObjetivoBioimpedanciaRepositorio {
  return {
    guardar: vi.fn(async (o: ObjetivoBioimpedancia) => o),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorVariable: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    ...parcial,
  };
}

const conPaciente = () =>
  mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () => pacienteEjemplo()),
  });

function medicion(
  id: string,
  fecha: string,
  datos: { pesoKg: number; masaGrasaKg?: number | null },
): Bioimpedancia {
  return Bioimpedancia.crear(
    { pacienteId: "pac-1", fecha: new Date(fecha), ...datos },
    id,
  );
}

describe("RegistrarBioimpedancia", () => {
  const DATOS = {
    pacienteId: "pac-1",
    fecha: new Date("2026-07-01"),
    pesoKg: 80,
  };

  it("registra la medición del paciente", async () => {
    const repo = mockBioimpedancias();
    const medicion = await new RegistrarBioimpedancia(
      repo,
      conPaciente(),
    ).ejecutar(DATOS);
    expect(medicion.medidas.pesoKg).toBe(80);
    expect(repo.crear).toHaveBeenCalledOnce();
  });

  it("rechaza si el paciente no existe", async () => {
    await expect(
      new RegistrarBioimpedancia(
        mockBioimpedancias(),
        mockPacienteRepositorio(),
      ).ejecutar(DATOS),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("una sola medición por fecha", async () => {
    const repo = mockBioimpedancias({ existeEnFecha: vi.fn(async () => true) });
    await expect(
      new RegistrarBioimpedancia(repo, conPaciente()).ejecutar(DATOS),
    ).rejects.toBeInstanceOf(ErrorBioimpedanciaDuplicada);
    expect(repo.crear).not.toHaveBeenCalled();
  });
});

describe("ActualizarBioimpedancia / EliminarBioimpedancia", () => {
  it("mover la fecha a una ocupada no escribe", async () => {
    const repo = mockBioimpedancias({
      obtenerPorId: vi.fn(async () =>
        medicion("b-1", "2026-07-01", { pesoKg: 80 }),
      ),
      existeEnFecha: vi.fn(async () => true),
    });
    await expect(
      new ActualizarBioimpedancia(repo).ejecutar("b-1", {
        fecha: new Date("2026-08-01"),
      }),
    ).rejects.toBeInstanceOf(ErrorBioimpedanciaDuplicada);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("eliminar una que no existe avisa", async () => {
    await expect(
      new EliminarBioimpedancia(mockBioimpedancias()).ejecutar("nada"),
    ).rejects.toBeInstanceOf(ErrorBioimpedanciaNoEncontrada);
  });
});

describe("GuardarObjetivoBioimpedancia", () => {
  it("replantea la meta existente de esa variable en vez de crear otra", async () => {
    const existente = ObjetivoBioimpedancia.crear(
      { pacienteId: "pac-1", variable: "MASA_GRASA_KG", valorObjetivo: 18 },
      "o-1",
    );
    const objetivos = mockObjetivos({
      obtenerPorVariable: vi.fn(async () => existente),
    });
    const guardado = await new GuardarObjetivoBioimpedancia(
      objetivos,
      conPaciente(),
    ).ejecutar({
      pacienteId: "pac-1",
      variable: "MASA_GRASA_KG",
      valorObjetivo: 16,
    });
    expect(guardado.id).toBe("o-1");
    expect(guardado.valorObjetivo).toBe(16);
  });
});

describe("ObtenerSeguimientoBioimpedancia", () => {
  it("ordena la serie, toma los valores actuales de la última y proyecta las metas", async () => {
    const bioimpedancias = mockBioimpedancias({
      // Desordenadas a propósito: el caso de uso las ordena por fecha.
      listarPorPaciente: vi.fn(async () => [
        medicion("b-2", "2026-02-01", { pesoKg: 84, masaGrasaKg: 22 }),
        medicion("b-1", "2026-01-01", { pesoKg: 86, masaGrasaKg: 24 }),
        medicion("b-3", "2026-03-01", { pesoKg: 83 }),
      ]),
    });
    const objetivo = ObjetivoBioimpedancia.crear(
      { pacienteId: "pac-1", variable: "MASA_GRASA_KG", valorObjetivo: 18 },
      "o-1",
      new Date("2025-12-15"),
    );
    const objetivos = mockObjetivos({
      listarPorPaciente: vi.fn(async () => [objetivo]),
    });

    const resultado = await new ObtenerSeguimientoBioimpedancia(
      bioimpedancias,
      objetivos,
      conPaciente(),
    ).ejecutar("pac-1", new Date("2026-03-15"));

    expect(resultado.mediciones.map((m) => m.id)).toEqual([
      "b-1",
      "b-2",
      "b-3",
    ]);
    // La última no trajo grasa: solo el peso es "actual".
    expect(resultado.valoresActuales).toEqual([
      { variable: "PESO", valor: 83 },
    ]);
    // La serie de grasa salta la consulta que no la midió.
    const { proyeccion } = resultado.objetivos[0]!;
    expect(proyeccion.valorInicial).toBe(24);
    expect(proyeccion.valorActual).toBe(22);
    expect(proyeccion.etiqueta).toBe("Masa grasa");
    expect(proyeccion.estado).toBe("EN_CAMINO");
  });
});

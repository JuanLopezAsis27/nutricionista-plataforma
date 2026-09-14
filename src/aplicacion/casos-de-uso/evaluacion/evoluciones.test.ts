import { describe, it, expect, vi } from "vitest";
import { RegistrarEvolucion } from "./RegistrarEvolucion";
import { ActualizarEvolucion } from "./ActualizarEvolucion";
import { ImportarEvoluciones } from "./ImportarEvoluciones";
import { Evolucion } from "@/dominio/entidades/Evolucion";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorEvolucionDuplicada } from "@/dominio/errores/ErrorEvolucionDuplicada";
import { ErrorEvolucionNoEncontrada } from "@/dominio/errores/ErrorEvolucionNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockEvolucionRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

function pacientes() {
  return mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () => pacienteEjemplo()),
  });
}

const CONSULTA_1 = {
  fecha: new Date("2024-07-12T00:00:00Z"),
  cumplimientoDieta: "50%. 10 días no respetó por viaje.",
};
const CONSULTA_2 = {
  fecha: new Date("2024-08-09T00:00:00Z"),
  descanso: "7 hs.",
};

describe("RegistrarEvolucion", () => {
  it("registra la evolución de la consulta", async () => {
    const evoluciones = mockEvolucionRepositorio();
    const casoUso = new RegistrarEvolucion(evoluciones, pacientes());

    const evolucion = await casoUso.ejecutar({
      pacienteId: "pac-1",
      ...CONSULTA_1,
    });

    expect(evolucion.pacienteId).toBe("pac-1");
    expect(evoluciones.crear).toHaveBeenCalledOnce();
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new RegistrarEvolucion(
      mockEvolucionRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1", ...CONSULTA_1 }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("rechaza una segunda evolución en la misma fecha", async () => {
    // Es el repaso de ESA consulta: dos del mismo día serían el mismo dato
    // partido en dos fichas que después nadie sabe cuál leer.
    const evoluciones = mockEvolucionRepositorio({
      existeEnFecha: vi.fn(async () => true),
    });
    const casoUso = new RegistrarEvolucion(evoluciones, pacientes());

    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1", ...CONSULTA_1 }),
    ).rejects.toBeInstanceOf(ErrorEvolucionDuplicada);
    expect(evoluciones.crear).not.toHaveBeenCalled();
  });
});

describe("ActualizarEvolucion", () => {
  function existente() {
    return Evolucion.crear(
      { pacienteId: "pac-1", ...CONSULTA_1 },
      "evo-1",
      new Date("2026-01-01T00:00:00Z"),
    );
  }

  it("edita la evolución existente", async () => {
    const evoluciones = mockEvolucionRepositorio({
      obtenerPorId: vi.fn(async () => existente()),
    });
    const casoUso = new ActualizarEvolucion(evoluciones);

    const editada = await casoUso.ejecutar("evo-1", { descanso: "8 hs." });

    expect(editada.aPrimitivos().descanso).toBe("8 hs.");
    expect(evoluciones.actualizar).toHaveBeenCalledOnce();
  });

  it("rechaza si la evolución no existe", async () => {
    const casoUso = new ActualizarEvolucion(mockEvolucionRepositorio());
    await expect(
      casoUso.ejecutar("evo-1", { descanso: "8 hs." }),
    ).rejects.toBeInstanceOf(ErrorEvolucionNoEncontrada);
  });

  it("no choca consigo misma cuando la fecha no cambió", async () => {
    // `existeEnFecha` tiene que excluir a la propia: sin eso, guardar dos
    // veces la misma evolución sin tocar la fecha fallaría como duplicada.
    const evoluciones = mockEvolucionRepositorio({
      obtenerPorId: vi.fn(async () => existente()),
      existeEnFecha: vi.fn(async (_id, _fecha, excluirId) => excluirId == null),
    });
    const casoUso = new ActualizarEvolucion(evoluciones);

    await expect(
      casoUso.ejecutar("evo-1", { descanso: "8 hs." }),
    ).resolves.toBeDefined();
    expect(evoluciones.existeEnFecha).toHaveBeenCalledWith(
      "pac-1",
      CONSULTA_1.fecha,
      "evo-1",
    );
  });
});

describe("ImportarEvoluciones", () => {
  it("importa todas las evoluciones del documento", async () => {
    const evoluciones = mockEvolucionRepositorio();
    const casoUso = new ImportarEvoluciones(evoluciones, pacientes());

    const resultado = await casoUso.ejecutar({
      pacienteId: "pac-1",
      evoluciones: [CONSULTA_1, CONSULTA_2],
    });

    expect(resultado.registradas).toBe(2);
    expect(evoluciones.crear).toHaveBeenCalledTimes(2);
  });

  it("salta la fecha ya cargada sin frenar el resto", async () => {
    // Es lo que hace que releer el mismo documento no duplique el seguimiento.
    const evoluciones = mockEvolucionRepositorio({
      existeEnFecha: vi.fn(
        async (_id: string, fecha: Date) =>
          fecha.getTime() === CONSULTA_1.fecha.getTime(),
      ),
    });
    const casoUso = new ImportarEvoluciones(evoluciones, pacientes());

    const resultado = await casoUso.ejecutar({
      pacienteId: "pac-1",
      evoluciones: [CONSULTA_1, CONSULTA_2],
    });

    expect(resultado.registradas).toBe(1);
    expect(resultado.resultados).toEqual([
      expect.objectContaining({ estado: "DUPLICADA" }),
      expect.objectContaining({ estado: "REGISTRADA" }),
    ]);
  });

  it("informa la evolución inválida y guarda las demás", async () => {
    const evoluciones = mockEvolucionRepositorio();
    const casoUso = new ImportarEvoluciones(evoluciones, pacientes());

    const resultado = await casoUso.ejecutar({
      pacienteId: "pac-1",
      // Sin un solo campo con contenido: la entidad la rechaza.
      evoluciones: [CONSULTA_1, { fecha: CONSULTA_2.fecha }],
    });

    expect(resultado.registradas).toBe(1);
    expect(resultado.resultados[1]).toMatchObject({ estado: "RECHAZADA" });
  });

  it("rechaza un lote vacío", async () => {
    const casoUso = new ImportarEvoluciones(
      mockEvolucionRepositorio(),
      pacientes(),
    );
    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1", evoluciones: [] }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("propaga un fallo de infraestructura en vez de anotarlo como rechazo", async () => {
    const evoluciones = mockEvolucionRepositorio({
      crear: vi.fn(async () => {
        throw new Error("la base se cayó");
      }),
    });
    const casoUso = new ImportarEvoluciones(evoluciones, pacientes());

    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1", evoluciones: [CONSULTA_1] }),
    ).rejects.toThrow("la base se cayó");
  });
});

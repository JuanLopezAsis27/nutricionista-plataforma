import { describe, it, expect, vi } from "vitest";
import { AgregarComidaDiario } from "./AgregarComidaDiario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockRegistroDiarioRepositorio,
  mockPacienteRepositorio,
  mockArchivoRepositorio,
  pacienteEjemplo,
  registroDiarioEjemplo,
} from "../_ayudas-test";

describe("AgregarComidaDiario", () => {
  it("crea el registro del día si no existía y agrega la comida", async () => {
    const registros = mockRegistroDiarioRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgregarComidaDiario(
      registros,
      pacientes,
      mockArchivoRepositorio(),
    );

    await casoUso.ejecutar("pac-1", new Date("2026-07-10"), {
      franja: "Desayuno",
      hora: "08:30",
      descripcion: "Omelette con pan integral",
    });

    expect(registros.crear).toHaveBeenCalledOnce();
    expect(registros.agregarComida).toHaveBeenCalledOnce();
  });

  it("reutiliza el registro existente del día", async () => {
    const existente = registroDiarioEjemplo();
    const registros = mockRegistroDiarioRepositorio({
      obtenerPorPacienteYFecha: vi.fn(async () => existente),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgregarComidaDiario(
      registros,
      pacientes,
      mockArchivoRepositorio(),
    );

    await casoUso.ejecutar("pac-1", new Date("2026-07-10"), {
      franja: "Almuerzo",
      descripcion: "Pollo con arroz",
    });

    expect(registros.crear).not.toHaveBeenCalled();
    expect(registros.agregarComida).toHaveBeenCalledWith(
      existente.id,
      expect.objectContaining({ franja: "Almuerzo" }),
    );
  });

  it("rechaza una comida sin descripción o con hora inválida", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgregarComidaDiario(
      mockRegistroDiarioRepositorio(),
      pacientes,
      mockArchivoRepositorio(),
    );

    await expect(
      casoUso.ejecutar("pac-1", new Date("2026-07-10"), {
        franja: "Cena",
        descripcion: "  ",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(
      casoUso.ejecutar("pac-1", new Date("2026-07-10"), {
        franja: "Cena",
        hora: "25:00",
        descripcion: "Milanesa",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("acepta una comida sin descripción si trae una foto", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgregarComidaDiario(
      mockRegistroDiarioRepositorio(),
      pacientes,
      mockArchivoRepositorio(),
    );

    await expect(
      casoUso.ejecutar("pac-1", new Date("2026-07-10"), {
        franja: "Cena",
        archivoId: "arch-1",
      }),
    ).resolves.toBeDefined();
  });

  it("vincula la foto a la comida recién creada", async () => {
    const registros = mockRegistroDiarioRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const archivos = mockArchivoRepositorio();
    const casoUso = new AgregarComidaDiario(registros, pacientes, archivos);

    await casoUso.ejecutar("pac-1", new Date("2026-07-10"), {
      franja: "Cena",
      archivoId: "arch-1",
    });

    const [, comidaCreada] = vi.mocked(registros.agregarComida).mock.calls[0]!;
    expect(archivos.vincularDueno).toHaveBeenCalledWith("arch-1", {
      comidaConsumidaId: comidaCreada.id,
    });
  });
});

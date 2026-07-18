import { describe, it, expect, vi } from "vitest";
import { AgregarComidaDiario } from "./AgregarComidaDiario";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockRegistroDiarioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  registroDiarioEjemplo,
} from "../_ayudas-test";

describe("AgregarComidaDiario", () => {
  it("crea el registro del día si no existía y agrega la comida", async () => {
    const registros = mockRegistroDiarioRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgregarComidaDiario(registros, pacientes);

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
    const casoUso = new AgregarComidaDiario(registros, pacientes);

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
    const casoUso = new AgregarComidaDiario(mockRegistroDiarioRepositorio(), pacientes);

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
});

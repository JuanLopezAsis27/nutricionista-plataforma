import { describe, it, expect, vi } from "vitest";
import { AgregarActividadDiario } from "./AgregarActividadDiario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockRegistroDiarioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  registroDiarioEjemplo,
} from "../_ayudas-test";

describe("AgregarActividadDiario", () => {
  it("agrega la actividad al registro existente", async () => {
    const existente = registroDiarioEjemplo();
    const registros = mockRegistroDiarioRepositorio({
      obtenerPorPacienteYFecha: vi.fn(async () => existente),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgregarActividadDiario(registros, pacientes);

    await casoUso.ejecutar("pac-1", new Date("2026-07-10"), {
      tipo: "Pesas",
      duracionMinutos: 60,
      intensidad: "ALTA",
    });

    expect(registros.agregarActividad).toHaveBeenCalledWith(
      existente.id,
      expect.objectContaining({ tipo: "Pesas", duracionMinutos: 60 }),
    );
  });

  it("rechaza duraciones inválidas", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgregarActividadDiario(
      mockRegistroDiarioRepositorio(),
      pacientes,
    );

    await expect(
      casoUso.ejecutar("pac-1", new Date("2026-07-10"), {
        tipo: "Running",
        duracionMinutos: 0,
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

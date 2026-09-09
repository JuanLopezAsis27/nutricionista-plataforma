import { describe, it, expect, vi } from "vitest";
import { ObtenerHistoriaClinica } from "./ObtenerHistoriaClinica";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockHistoriaClinicaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  historiaClinicaEjemplo,
} from "../_ayudas-test";

describe("ObtenerHistoriaClinica", () => {
  it("devuelve la historia del paciente", async () => {
    const historia = historiaClinicaEjemplo();
    const casoUso = new ObtenerHistoriaClinica(
      mockHistoriaClinicaRepositorio({
        obtenerPorPaciente: vi.fn(async () => historia),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );
    expect(await casoUso.ejecutar("pac-1")).toBe(historia);
  });

  it("devuelve null si todavía no se cargó (no es error)", async () => {
    const casoUso = new ObtenerHistoriaClinica(
      mockHistoriaClinicaRepositorio(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );
    expect(await casoUso.ejecutar("pac-1")).toBeNull();
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new ObtenerHistoriaClinica(
      mockHistoriaClinicaRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});

import { describe, it, expect, vi } from "vitest";
import { RegistrarLaboratorio } from "./RegistrarLaboratorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockLaboratorioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("RegistrarLaboratorio", () => {
  it("registra el estudio vinculando los archivos ya subidos", async () => {
    const laboratorios = mockLaboratorioRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new RegistrarLaboratorio(laboratorios, pacientes);

    await casoUso.ejecutar({
      pacienteId: "pac-1",
      fecha: new Date("2026-07-01"),
      titulo: "Perfil lipídico",
      archivoIds: ["arc-1", "arc-2"],
    });

    expect(laboratorios.crear).toHaveBeenCalledWith(expect.anything(), [
      "arc-1",
      "arc-2",
    ]);
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new RegistrarLaboratorio(
      mockLaboratorioRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar({
        pacienteId: "no-existe",
        fecha: new Date("2026-07-01"),
        titulo: "Perfil",
      }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("rechaza un estudio sin título", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new RegistrarLaboratorio(
      mockLaboratorioRepositorio(),
      pacientes,
    );
    await expect(
      casoUso.ejecutar({
        pacienteId: "pac-1",
        fecha: new Date("2026-07-01"),
        titulo: " ",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

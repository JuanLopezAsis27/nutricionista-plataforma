import { describe, it, expect, vi } from "vitest";
import { ObtenerLaboratorios } from "./ObtenerLaboratorios";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockLaboratorioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  laboratorioEjemplo,
} from "../_ayudas-test";

describe("ObtenerLaboratorios", () => {
  it("devuelve los laboratorios del paciente", async () => {
    const casoUso = new ObtenerLaboratorios(
      mockLaboratorioRepositorio({
        listarPorPaciente: vi.fn(async () => [laboratorioEjemplo()]),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const laboratorios = await casoUso.ejecutar("pac-1");

    expect(laboratorios).toHaveLength(1);
    expect(laboratorios[0]?.titulo).toBe("Perfil lipídico");
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new ObtenerLaboratorios(
      mockLaboratorioRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});

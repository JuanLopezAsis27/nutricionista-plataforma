import { describe, it, expect, vi } from "vitest";
import { ObtenerDietaDelPaciente } from "./ObtenerDietaDelPaciente";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockDietaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  dietaEjemplo,
} from "../_ayudas-test";

describe("ObtenerDietaDelPaciente", () => {
  it("devuelve la dieta activa del paciente", async () => {
    const dietas = mockDietaRepositorio({
      obtenerDietaActivaDePaciente: vi.fn(async () => dietaEjemplo()),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new ObtenerDietaDelPaciente(dietas, pacientes);

    const dieta = await casoUso.ejecutar("pac-1");

    expect(dieta?.id).toBe("die-1");
  });

  it("devuelve null si el paciente no tiene dieta asignada", async () => {
    const dietas = mockDietaRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new ObtenerDietaDelPaciente(dietas, pacientes);

    const dieta = await casoUso.ejecutar("pac-1");

    expect(dieta).toBeNull();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const dietas = mockDietaRepositorio();
    const pacientes = mockPacienteRepositorio();
    const casoUso = new ObtenerDietaDelPaciente(dietas, pacientes);

    await expect(casoUso.ejecutar("x")).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });
});

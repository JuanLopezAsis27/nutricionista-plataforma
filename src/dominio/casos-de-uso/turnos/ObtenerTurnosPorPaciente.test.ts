import { describe, it, expect, vi } from "vitest";
import { ObtenerTurnosPorPaciente } from "./ObtenerTurnosPorPaciente";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";

describe("ObtenerTurnosPorPaciente", () => {
  it("devuelve los turnos del paciente cuando existe", async () => {
    const turnos = mockTurnoRepositorio({
      obtenerPorPaciente: vi.fn(async () => [turnoEjemplo()]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new ObtenerTurnosPorPaciente(turnos, pacientes);

    const resultado = await casoUso.ejecutar("pac-1");

    expect(resultado).toHaveLength(1);
    expect(turnos.obtenerPorPaciente).toHaveBeenCalledWith("pac-1");
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio();
    const casoUso = new ObtenerTurnosPorPaciente(turnos, pacientes);

    await expect(casoUso.ejecutar("x")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
    expect(turnos.obtenerPorPaciente).not.toHaveBeenCalled();
  });
});

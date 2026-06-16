import { describe, it, expect, vi } from "vitest";
import { AgendarTurno } from "./AgendarTurno";
import { Turno, type DatosNuevoTurno } from "../../entidades/Turno";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorTurnoConflicto } from "../../errores/ErrorTurnoConflicto";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";

const datos: DatosNuevoTurno = {
  pacienteId: "pac-1",
  fecha: new Date("2026-07-01"),
  hora: "10:00",
  duracionMinutos: 30,
  notas: null,
};

describe("AgendarTurno", () => {
  it("agenda un turno cuando el paciente existe y no hay solapamiento", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(turnos, pacientes);

    const turno = await casoUso.ejecutar(datos);

    expect(turno).toBeInstanceOf(Turno);
    expect(turno.estado).toBe("PENDIENTE");
    expect(turnos.crear).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio();
    const casoUso = new AgendarTurno(turnos, pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("lanza ErrorTurnoConflicto si se solapa con otro turno", async () => {
    const existente = turnoEjemplo({ hora: "10:15", duracionMinutos: 30 }, "tur-existente");
    const turnos = mockTurnoRepositorio({
      obtenerEnFecha: vi.fn(async () => [existente]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(turnos, pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(ErrorTurnoConflicto);
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("ignora los turnos cancelados al verificar solapamiento", async () => {
    const cancelado = turnoEjemplo({ hora: "10:00", duracionMinutos: 30 }, "tur-cancelado");
    cancelado.cancelar();
    const turnos = mockTurnoRepositorio({
      obtenerEnFecha: vi.fn(async () => [cancelado]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(turnos, pacientes);

    const turno = await casoUso.ejecutar(datos);

    expect(turno.estado).toBe("PENDIENTE");
    expect(turnos.crear).toHaveBeenCalledOnce();
  });
});

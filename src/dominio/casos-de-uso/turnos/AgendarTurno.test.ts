import { describe, it, expect, vi } from "vitest";
import { AgendarTurno } from "./AgendarTurno";
import { Turno, type DatosNuevoTurno } from "../../entidades/Turno";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorTurnoConflicto } from "../../errores/ErrorTurnoConflicto";
import { ErrorTurnoFueraDeAtencion } from "../../errores/ErrorTurnoFueraDeAtencion";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  pacienteEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";

/** Repositorio de configuración con la agenda pedida (sin fila = por defecto). */
function configuracionCon(
  cambios: Partial<Parameters<ConfiguracionConsultorio["actualizar"]>[0]>,
) {
  const config = ConfiguracionConsultorio.porDefecto().actualizar(cambios);
  return mockConfiguracionRepositorio({ obtener: vi.fn(async () => config) });
}

// 2026-07-01 es miércoles, día de atención en la configuración por defecto.
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
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockConfiguracionRepositorio(),
    );

    const turno = await casoUso.ejecutar(datos);

    expect(turno).toBeInstanceOf(Turno);
    expect(turno.estado).toBe("PENDIENTE");
    expect(turnos.crear).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio();
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockConfiguracionRepositorio(),
    );

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("lanza ErrorTurnoConflicto si se solapa con otro turno", async () => {
    const existente = turnoEjemplo(
      { hora: "10:15", duracionMinutos: 30 },
      "tur-existente",
    );
    const turnos = mockTurnoRepositorio({
      obtenerEnFecha: vi.fn(async () => [existente]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockConfiguracionRepositorio(),
    );

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorTurnoConflicto,
    );
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("ignora los turnos cancelados al verificar solapamiento", async () => {
    const cancelado = turnoEjemplo(
      { hora: "10:00", duracionMinutos: 30 },
      "tur-cancelado",
    );
    cancelado.cancelar();
    const turnos = mockTurnoRepositorio({
      obtenerEnFecha: vi.fn(async () => [cancelado]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockConfiguracionRepositorio(),
    );

    const turno = await casoUso.ejecutar(datos);

    expect(turno.estado).toBe("PENDIENTE");
    expect(turnos.crear).toHaveBeenCalledOnce();
  });

  it("rechaza un turno en un día que el consultorio no atiende", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    // Solo lunes: el miércoles del caso deja de ser día de atención.
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      configuracionCon({ diasAtencion: [1] }),
    );

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorTurnoFueraDeAtencion,
    );
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("rechaza un turno que termina después de la hora de cierre", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      configuracionCon({
        atencionHoraDesde: "09:00",
        atencionHoraHasta: "10:15",
      }),
    );

    // Arranca dentro del horario, pero los 30 min lo dejan 15 después del cierre.
    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorTurnoFueraDeAtencion,
    );
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("acepta el turno que termina justo a la hora de cierre", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      configuracionCon({
        atencionHoraDesde: "09:00",
        atencionHoraHasta: "10:30",
      }),
    );

    await expect(casoUso.ejecutar(datos)).resolves.toBeInstanceOf(Turno);
  });
});

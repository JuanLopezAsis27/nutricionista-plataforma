import { describe, it, expect, vi } from "vitest";
import { AgendarTurno } from "./AgendarTurno";
import { Turno, type DatosNuevoTurno } from "@/dominio/entidades/Turno";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorTurnoConflicto } from "@/dominio/errores/ErrorTurnoConflicto";
import { ErrorTurnoFueraDeAtencion } from "@/dominio/errores/ErrorTurnoFueraDeAtencion";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockEstablecimientoRepositorio,
  establecimientoEjemplo,
  pacienteEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";

/** Repositorio con una única sede, cuya agenda es la que se le pide. */
function sedeConAgenda(
  agenda: Partial<Parameters<typeof establecimientoEjemplo>[0]>,
) {
  const sede = establecimientoEjemplo(agenda);
  return mockEstablecimientoRepositorio({
    obtenerPorId: vi.fn(async () => sede),
    obtenerPrincipal: vi.fn(async () => sede),
    listar: vi.fn(async () => [sede]),
  });
}

// 2026-07-01 es miércoles. La sede de ejemplo no restringe días ni horario.
const datos: DatosNuevoTurno = {
  pacienteId: "pac-1",
  establecimientoId: "est-1",
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
      mockEstablecimientoRepositorio(),
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
      mockEstablecimientoRepositorio(),
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
      mockEstablecimientoRepositorio(),
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
      mockEstablecimientoRepositorio(),
    );

    const turno = await casoUso.ejecutar(datos);

    expect(turno.estado).toBe("PENDIENTE");
    expect(turnos.crear).toHaveBeenCalledOnce();
  });

  it("rechaza un turno en un día que esa sede no atiende", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    // Solo lunes: el miércoles del caso deja de ser día de atención.
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      sedeConAgenda({ diasAtencion: [1] }),
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
      sedeConAgenda({
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
      sedeConAgenda({
        atencionHoraDesde: "09:00",
        atencionHoraHasta: "10:30",
      }),
    );

    await expect(casoUso.ejecutar(datos)).resolves.toBeInstanceOf(Turno);
  });

  // --- Establecimiento ------------------------------------------------------

  it("usa la sede principal cuando la pantalla no eligió ninguna", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockEstablecimientoRepositorio(),
    );

    const { establecimientoId: _omitido, ...sinSede } = datos;
    const turno = await casoUso.ejecutar(sinSede);

    expect(turno.establecimientoId).toBe("est-1");
  });

  it("cae en la primera sede vigente si no hay ninguna marcada como principal", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    // El consultorio archivó su principal y todavía no marcó otra.
    const otra = establecimientoEjemplo(
      { nombre: "Consultorio barrio" },
      "est-9",
    );
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockEstablecimientoRepositorio({
        obtenerPrincipal: vi.fn(async () => null),
        listar: vi.fn(async () => [otra]),
      }),
    );

    const { establecimientoId: _omitido, ...sinSede } = datos;
    const turno = await casoUso.ejecutar(sinSede);

    expect(turno.establecimientoId).toBe("est-9");
  });

  it("rechaza el turno si el consultorio no tiene ninguna sede activa", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockEstablecimientoRepositorio({
        obtenerPrincipal: vi.fn(async () => null),
        listar: vi.fn(async () => []),
      }),
    );

    const { establecimientoId: _omitido, ...sinSede } = datos;
    await expect(casoUso.ejecutar(sinSede)).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("rechaza una sede que no existe", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockEstablecimientoRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ ...datos, establecimientoId: "est-inventado" }),
    ).rejects.toBeInstanceOf(ErrorEstablecimientoNoEncontrado);
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("rechaza agendar en una sede archivada", async () => {
    const turnos = mockTurnoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const cerrada = establecimientoEjemplo({}, "est-1").archivar();
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockEstablecimientoRepositorio({
        obtenerPorId: vi.fn(async () => cerrada),
      }),
    );

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(turnos.crear).not.toHaveBeenCalled();
  });

  it("el solapamiento no distingue de sede: el profesional es uno solo", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    // Ya hay un turno a las 10:00 en OTRO establecimiento.
    const turnos = mockTurnoRepositorio({
      obtenerEnFecha: vi.fn(async () => [
        turnoEjemplo({ establecimientoId: "est-9", hora: "10:00" }, "tur-9"),
      ]),
    });
    const casoUso = new AgendarTurno(
      turnos,
      pacientes,
      mockEstablecimientoRepositorio(),
    );

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorTurnoConflicto,
    );
    expect(turnos.crear).not.toHaveBeenCalled();
  });
});

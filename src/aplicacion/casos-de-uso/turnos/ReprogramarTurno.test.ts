import { describe, it, expect, vi } from "vitest";
import { ReprogramarTurno } from "./ReprogramarTurno";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorTurnoConflicto } from "@/dominio/errores/ErrorTurnoConflicto";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorTurnoFueraDeAtencion } from "@/dominio/errores/ErrorTurnoFueraDeAtencion";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import {
  mockTurnoRepositorio,
  mockEstablecimientoRepositorio,
  establecimientoEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";

// 2026-07-01 es miércoles, día de atención en la configuración por defecto.
const fecha = new Date("2026-07-01");

describe("ReprogramarTurno", () => {
  it("reprograma un turno cuando no hay solapamiento", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
      obtenerEnFecha: vi.fn(async () => []),
    });
    const casoUso = new ReprogramarTurno(
      repositorio,
      mockEstablecimientoRepositorio(),
    );

    const turno = await casoUso.ejecutar({ id: "tur-1", fecha, hora: "11:00" });

    expect(turno.hora).toBe("11:00");
    expect(repositorio.actualizar).toHaveBeenCalledOnce();
  });

  it("ignora el propio turno al verificar solapamiento", async () => {
    const turno = turnoEjemplo();
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turno),
      obtenerEnFecha: vi.fn(async () => [turno]),
    });
    const casoUso = new ReprogramarTurno(
      repositorio,
      mockEstablecimientoRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ id: "tur-1", fecha, hora: "12:00" }),
    ).resolves.toBeDefined();
  });

  it("lanza ErrorTurnoNoEncontrado si el turno no existe", async () => {
    const repositorio = mockTurnoRepositorio();
    const casoUso = new ReprogramarTurno(
      repositorio,
      mockEstablecimientoRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ id: "x", fecha, hora: "11:00" }),
    ).rejects.toBeInstanceOf(ErrorTurnoNoEncontrado);
  });

  it("lanza ErrorTurnoConflicto si el nuevo horario se solapa con otro", async () => {
    const otro = turnoEjemplo({ hora: "11:00", duracionMinutos: 30 }, "otro");
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
      obtenerEnFecha: vi.fn(async () => [otro]),
    });
    const casoUso = new ReprogramarTurno(
      repositorio,
      mockEstablecimientoRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ id: "tur-1", fecha, hora: "11:15" }),
    ).rejects.toBeInstanceOf(ErrorTurnoConflicto);
  });

  it("no permite reprogramar un turno cancelado", async () => {
    const cancelado = turnoEjemplo();
    cancelado.cancelar();
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => cancelado),
    });
    const casoUso = new ReprogramarTurno(
      repositorio,
      mockEstablecimientoRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ id: "tur-1", fecha, hora: "11:00" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("rechaza mover el turno a un día que esa sede no atiende", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
      obtenerEnFecha: vi.fn(async () => []),
    });
    // La sede solo atiende los lunes: el miércoles deja de ser válido.
    const sede = establecimientoEjemplo({ diasAtencion: [1] });
    const casoUso = new ReprogramarTurno(
      repositorio,
      mockEstablecimientoRepositorio({
        obtenerPorId: vi.fn(async () => sede),
      }),
    );

    await expect(
      casoUso.ejecutar({ id: "tur-1", fecha, hora: "11:00" }),
    ).rejects.toBeInstanceOf(ErrorTurnoFueraDeAtencion);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  // --- Cambio de sede -------------------------------------------------------

  it("mueve el turno de establecimiento", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
      obtenerEnFecha: vi.fn(async () => []),
    });
    const destino = establecimientoEjemplo({ nombre: "Barrio" }, "est-9");
    const casoUso = new ReprogramarTurno(
      repositorio,
      mockEstablecimientoRepositorio({
        obtenerPorId: vi.fn(async () => destino),
      }),
    );

    const turno = await casoUso.ejecutar({
      id: "tur-1",
      fecha,
      hora: "11:00",
      establecimientoId: "est-9",
    });

    expect(turno.establecimientoId).toBe("est-9");
  });

  it("sin establecimientoId el turno se queda donde estaba", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
      obtenerEnFecha: vi.fn(async () => []),
    });
    const establecimientos = mockEstablecimientoRepositorio();
    const casoUso = new ReprogramarTurno(repositorio, establecimientos);

    const turno = await casoUso.ejecutar({ id: "tur-1", fecha, hora: "11:00" });

    expect(turno.establecimientoId).toBe("est-1");
    // Se consulta igual, pero la del turno: es de donde sale la agenda contra
    // la que se valida el nuevo horario.
    expect(establecimientos.obtenerPorId).toHaveBeenCalledWith("est-1");
  });

  it("rechaza mover el turno a una sede que no existe, sin tocarlo", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
      obtenerEnFecha: vi.fn(async () => []),
    });
    const casoUso = new ReprogramarTurno(
      repositorio,
      mockEstablecimientoRepositorio({
        obtenerPorId: vi.fn(async () => null),
      }),
    );

    await expect(
      casoUso.ejecutar({
        id: "tur-1",
        fecha,
        hora: "11:00",
        establecimientoId: "est-inventado",
      }),
    ).rejects.toBeInstanceOf(ErrorEstablecimientoNoEncontrado);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });
});

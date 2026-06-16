import { describe, it, expect, vi } from "vitest";
import { ReprogramarTurno } from "./ReprogramarTurno";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";
import { ErrorTurnoConflicto } from "../../errores/ErrorTurnoConflicto";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockTurnoRepositorio, turnoEjemplo } from "../_ayudas-test";

const fecha = new Date("2026-07-01");

describe("ReprogramarTurno", () => {
  it("reprograma un turno cuando no hay solapamiento", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
      obtenerEnFecha: vi.fn(async () => []),
    });
    const casoUso = new ReprogramarTurno(repositorio);

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
    const casoUso = new ReprogramarTurno(repositorio);

    await expect(
      casoUso.ejecutar({ id: "tur-1", fecha, hora: "12:00" }),
    ).resolves.toBeDefined();
  });

  it("lanza ErrorTurnoNoEncontrado si el turno no existe", async () => {
    const repositorio = mockTurnoRepositorio();
    const casoUso = new ReprogramarTurno(repositorio);

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
    const casoUso = new ReprogramarTurno(repositorio);

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
    const casoUso = new ReprogramarTurno(repositorio);

    await expect(
      casoUso.ejecutar({ id: "tur-1", fecha, hora: "11:00" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

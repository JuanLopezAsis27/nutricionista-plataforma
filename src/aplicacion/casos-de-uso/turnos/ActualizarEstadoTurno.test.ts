import { describe, it, expect, vi } from "vitest";
import { ActualizarEstadoTurno } from "./ActualizarEstadoTurno";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { mockTurnoRepositorio, turnoEjemplo } from "../_ayudas-test";

describe("ActualizarEstadoTurno", () => {
  it("confirma un turno PENDIENTE", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
    });
    const casoUso = new ActualizarEstadoTurno(repositorio);

    const turno = await casoUso.ejecutar("tur-1", "CONFIRMADO");

    expect(turno.estado).toBe("CONFIRMADO");
    expect(repositorio.actualizar).toHaveBeenCalledOnce();
  });

  it("lanza ErrorTurnoNoEncontrado si el turno no existe", async () => {
    const repositorio = mockTurnoRepositorio();
    const casoUso = new ActualizarEstadoTurno(repositorio);

    await expect(casoUso.ejecutar("x", "CONFIRMADO")).rejects.toBeInstanceOf(
      ErrorTurnoNoEncontrado,
    );
  });

  it("rechaza una transición inválida (PENDIENTE → COMPLETADO)", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
    });
    const casoUso = new ActualizarEstadoTurno(repositorio);

    await expect(
      casoUso.ejecutar("tur-1", "COMPLETADO"),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });
});

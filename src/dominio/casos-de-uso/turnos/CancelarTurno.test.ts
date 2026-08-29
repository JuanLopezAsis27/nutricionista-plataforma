import { describe, it, expect, vi } from "vitest";
import { CancelarTurno } from "./CancelarTurno";
import { ActualizarEstadoTurno } from "./ActualizarEstadoTurno";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockTurnoRepositorio, turnoEjemplo } from "../_ayudas-test";

describe("CancelarTurno", () => {
  it("cancela un turno PENDIENTE delegando en ActualizarEstadoTurno", async () => {
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
    });
    const actualizar = new ActualizarEstadoTurno(repositorio);
    const casoUso = new CancelarTurno(repositorio, actualizar);

    const turno = await casoUso.ejecutar("tur-1");

    expect(turno.estado).toBe("CANCELADO");
  });

  it("lanza ErrorTurnoNoEncontrado si no existe", async () => {
    const repositorio = mockTurnoRepositorio();
    const casoUso = new CancelarTurno(
      repositorio,
      new ActualizarEstadoTurno(repositorio),
    );

    await expect(casoUso.ejecutar("x")).rejects.toBeInstanceOf(
      ErrorTurnoNoEncontrado,
    );
  });

  it("no permite cancelar un turno ya COMPLETADO", async () => {
    const completado = turnoEjemplo();
    completado.cambiarEstado("CONFIRMADO");
    completado.cambiarEstado("COMPLETADO");
    const repositorio = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => completado),
    });
    const casoUso = new CancelarTurno(
      repositorio,
      new ActualizarEstadoTurno(repositorio),
    );

    await expect(casoUso.ejecutar("tur-1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
  });
});

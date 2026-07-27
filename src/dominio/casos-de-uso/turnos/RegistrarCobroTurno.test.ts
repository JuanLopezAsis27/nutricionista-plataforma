import { describe, it, expect, vi } from "vitest";
import { RegistrarCobroTurno } from "./RegistrarCobroTurno";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockTurnoRepositorio, turnoEjemplo } from "../_ayudas-test";

describe("RegistrarCobroTurno", () => {
  it("registra precio y estado de pago del turno", async () => {
    const turno = turnoEjemplo();
    const actualizar = vi.fn(async (t) => t);
    const repo = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turno),
      actualizar,
    });

    const resultado = await new RegistrarCobroTurno(repo).ejecutar("tur-1", 15000, true);

    expect(resultado.precio).toBe(15000);
    expect(resultado.pagado).toBe(true);
    expect(actualizar).toHaveBeenCalledOnce();
  });

  it("permite dejar el turno sin precio (sin cargo)", async () => {
    const turno = turnoEjemplo();
    const repo = mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => turno) });

    const resultado = await new RegistrarCobroTurno(repo).ejecutar("tur-1", null, false);

    expect(resultado.precio).toBeNull();
    expect(resultado.pagado).toBe(false);
  });

  it("rechaza marcar pagado un turno sin precio", async () => {
    const turno = turnoEjemplo();
    const repo = mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => turno) });

    await expect(
      new RegistrarCobroTurno(repo).ejecutar("tur-1", null, true),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("rechaza un precio negativo", async () => {
    const turno = turnoEjemplo();
    const repo = mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => turno) });

    await expect(
      new RegistrarCobroTurno(repo).ejecutar("tur-1", -5, false),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("lanza ErrorTurnoNoEncontrado si el turno no existe", async () => {
    const repo = mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => null) });

    await expect(
      new RegistrarCobroTurno(repo).ejecutar("inexistente", 100, true),
    ).rejects.toBeInstanceOf(ErrorTurnoNoEncontrado);
  });
});

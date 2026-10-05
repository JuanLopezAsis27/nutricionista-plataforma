import { describe, it, expect, vi } from "vitest";
import { ActualizarEstadoTurnosEnLote } from "./ActualizarEstadoTurnosEnLote";
import { ActualizarEstadoTurno } from "./ActualizarEstadoTurno";
import { mockTurnoRepositorio, turnoEjemplo } from "../_ayudas-test";

describe("ActualizarEstadoTurnosEnLote", () => {
  it("aplica a los que admiten la transición y omite al resto con el motivo", async () => {
    const pendiente = turnoEjemplo({}, "tur-1");
    const cancelado = turnoEjemplo({}, "tur-2");
    cancelado.cambiarEstado("CANCELADO");
    const porId = new Map([
      ["tur-1", pendiente],
      ["tur-2", cancelado],
    ]);
    const repo = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async (id: string) => porId.get(id) ?? null),
    });

    const resultado = await new ActualizarEstadoTurnosEnLote(
      new ActualizarEstadoTurno(repo),
    ).ejecutar(["tur-1", "tur-2", "inexistente"], "CONFIRMADO");

    expect(resultado.actualizados.map((t) => t.id)).toEqual(["tur-1"]);
    expect(resultado.actualizados[0]?.estado).toBe("CONFIRMADO");
    expect(resultado.omitidos.map((o) => o.id)).toEqual([
      "tur-2",
      "inexistente",
    ]);
    expect(resultado.omitidos[0]?.motivo).toMatch(/no permitida/);
  });

  it("no repite un id que llegó dos veces", async () => {
    const repo = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turnoEjemplo()),
    });

    const resultado = await new ActualizarEstadoTurnosEnLote(
      new ActualizarEstadoTurno(repo),
    ).ejecutar(["tur-1", "tur-1"], "CONFIRMADO");

    expect(resultado.actualizados).toHaveLength(1);
    expect(repo.actualizar).toHaveBeenCalledOnce();
  });

  it("deja pasar un error que no es de dominio", async () => {
    const repo = mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => {
        throw new Error("base caída");
      }),
    });

    await expect(
      new ActualizarEstadoTurnosEnLote(
        new ActualizarEstadoTurno(repo),
      ).ejecutar(["tur-1"], "CONFIRMADO"),
    ).rejects.toThrow("base caída");
  });
});

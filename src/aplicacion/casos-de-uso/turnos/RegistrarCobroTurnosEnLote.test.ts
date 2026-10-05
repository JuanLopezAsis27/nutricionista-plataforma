import { describe, it, expect, vi } from "vitest";
import type { Turno } from "@/dominio/entidades/Turno";
import { RegistrarCobroTurnosEnLote } from "./RegistrarCobroTurnosEnLote";
import { RegistrarCobroTurno } from "./RegistrarCobroTurno";
import { mockTurnoRepositorio, turnoEjemplo } from "../_ayudas-test";

function armar(turnos: Turno[]) {
  const porId = new Map(turnos.map((t) => [t.id, t]));
  const repo = mockTurnoRepositorio({
    obtenerPorId: vi.fn(async (id: string) => porId.get(id) ?? null),
  });
  return new RegistrarCobroTurnosEnLote(repo, new RegistrarCobroTurno(repo));
}

describe("RegistrarCobroTurnosEnLote", () => {
  it("marcar pagados respeta el precio de cada uno y omite al que no tiene", async () => {
    const conPrecio = turnoEjemplo({}, "tur-1");
    conPrecio.registrarCobro(12000, false);
    const sinPrecio = turnoEjemplo({}, "tur-2");

    const resultado = await armar([conPrecio, sinPrecio]).ejecutar(
      ["tur-1", "tur-2"],
      { pagado: true },
    );

    expect(resultado.actualizados).toHaveLength(1);
    expect(resultado.actualizados[0]?.precio).toBe(12000);
    expect(resultado.actualizados[0]?.pagado).toBe(true);
    expect(resultado.omitidos).toEqual([
      { id: "tur-2", motivo: expect.stringMatching(/sin precio/) },
    ]);
  });

  it("poner un precio no le borra el pago a ninguno", async () => {
    const pagado = turnoEjemplo({}, "tur-1");
    pagado.registrarCobro(10000, true);

    const resultado = await armar([pagado]).ejecutar(["tur-1"], {
      precio: 15000,
    });

    expect(resultado.actualizados[0]?.precio).toBe(15000);
    expect(resultado.actualizados[0]?.pagado).toBe(true);
  });

  it("dejarlo sin cargo le saca el pago si no se dijo nada del pago", async () => {
    const pagado = turnoEjemplo({}, "tur-1");
    pagado.registrarCobro(10000, true);

    const resultado = await armar([pagado]).ejecutar(["tur-1"], {
      precio: null,
    });

    expect(resultado.omitidos).toEqual([]);
    expect(resultado.actualizados[0]?.precio).toBeNull();
    expect(resultado.actualizados[0]?.pagado).toBe(false);
  });

  it("precio y pago juntos se aplican a todos", async () => {
    const resultado = await armar([
      turnoEjemplo({}, "tur-1"),
      turnoEjemplo({}, "tur-2"),
    ]).ejecutar(["tur-1", "tur-2"], { precio: 8000, pagado: true });

    expect(resultado.actualizados.every((t) => t.pagado)).toBe(true);
    expect(resultado.actualizados.every((t) => t.precio === 8000)).toBe(true);
  });
});

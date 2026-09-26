import { describe, it, expect } from "vitest";
import { elegirFichaDelTelefono } from "./fichaPorTelefono";

const sofia = { id: "sofia" };
const tomas = { id: "tomas" };
// En el orden en que llegan: la más antigua primero.
const hermanos = [sofia, tomas];

describe("elegirFichaDelTelefono", () => {
  it("con una sola ficha no hay nada que decidir", () => {
    expect(elegirFichaDelTelefono([tomas])).toBe(tomas);
    expect(elegirFichaDelTelefono([])).toBeNull();
  });

  it("el turno del botón manda sobre todo", () => {
    expect(
      elegirFichaDelTelefono(hermanos, {
        pacienteDelTurno: "tomas",
        pacienteDelUltimoSaliente: "sofia",
      }),
    ).toBe(tomas);
  });

  it("sin botón, la ficha a la que se le escribió por última vez", () => {
    expect(
      elegirFichaDelTelefono(hermanos, { pacienteDelUltimoSaliente: "tomas" }),
    ).toBe(tomas);
  });

  it("sin pistas, la más antigua (siempre la misma)", () => {
    expect(elegirFichaDelTelefono(hermanos)).toBe(sofia);
  });

  it("una pista que no es de este número se ignora", () => {
    expect(
      elegirFichaDelTelefono(hermanos, {
        pacienteDelTurno: "otro",
        pacienteDelUltimoSaliente: "otro-mas",
      }),
    ).toBe(sofia);
  });
});

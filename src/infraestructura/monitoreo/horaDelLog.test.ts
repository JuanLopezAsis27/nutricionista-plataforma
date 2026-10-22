import { describe, it, expect, vi } from "vitest";
import { anteponerHoraAlLog, horaLocal } from "./horaDelLog";

const ARGENTINA = "America/Argentina/Buenos_Aires";
// 17:05:03 UTC = 14:05:03 en Argentina (UTC-3, sin horario de verano).
const INSTANTE = new Date("2026-10-21T17:05:03Z");

function consolaFalsa() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("horaLocal", () => {
  it("da la hora de Argentina, no la UTC", () => {
    expect(horaLocal(INSTANTE, ARGENTINA)).toBe("21/10/2026 14:05:03");
  });

  it("cambia de día según la zona: las 01:30 UTC todavía son el día anterior", () => {
    expect(horaLocal(new Date("2026-10-22T01:30:00Z"), ARGENTINA)).toBe(
      "21/10/2026 22:30:00",
    );
  });
});

describe("anteponerHoraAlLog", () => {
  it("antepone la hora a cada nivel y deja el resto de los argumentos", () => {
    const consola = consolaFalsa();
    const { log, error } = consola;
    anteponerHoraAlLog(consola, () => INSTANTE);

    consola.log("[worker] iniciado");
    const falla = new Error("smtp caído");
    consola.error("[recordatorios] falló el email:", falla);

    const hora = `[${horaLocal(INSTANTE)}]`;
    expect(log).toHaveBeenCalledWith(hora, "[worker] iniciado");
    expect(error).toHaveBeenCalledWith(
      hora,
      "[recordatorios] falló el email:",
      falla,
    );
  });

  it("instalarla dos veces no duplica la hora (Next puede volver a llamar a register)", () => {
    const consola = consolaFalsa();
    const { log } = consola;
    anteponerHoraAlLog(consola, () => INSTANTE);
    anteponerHoraAlLog(consola, () => INSTANTE);

    consola.log("hola");

    expect(log).toHaveBeenCalledWith(`[${horaLocal(INSTANTE)}]`, "hola");
  });

  it("no toca las líneas JSON del monitor: seguirían sin poder parsearse", () => {
    const consola = consolaFalsa();
    const { error } = consola;
    anteponerHoraAlLog(consola, () => INSTANTE);

    const cabecera = JSON.stringify({ nivel: "error", ts: "…" });
    consola.error(cabecera);

    expect(error).toHaveBeenCalledWith(cabecera);
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { esFechaPasada } from "./formato";

/**
 * `esFechaPasada` compara DÍAS: una columna DATE llega como medianoche UTC, y
 * contra la medianoche local, al oeste de Greenwich, el día de hoy quedaba
 * «antes de hoy». La carrera de hoy figuraba como terminada.
 */
describe("esFechaPasada", () => {
  afterEach(() => vi.useRealTimers());

  it("hoy no está pasado, aunque el DATE sea medianoche UTC y el reloj vaya atrasado", () => {
    // 24/10 a las 21:00 en Argentina (UTC-3) = 25/10 00:00 UTC. El «hoy» del
    // navegador es el 24, y la competencia del 24 no terminó.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 24, 21, 0));
    expect(esFechaPasada(new Date("2026-10-24T00:00:00.000Z"))).toBe(false);
    expect(esFechaPasada("2026-10-23T00:00:00.000Z")).toBe(true);
    expect(esFechaPasada(new Date("2026-10-25T00:00:00.000Z"))).toBe(false);
  });

  it("a la mañana temprano, el día de hoy tampoco está pasado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 24, 0, 30));
    expect(esFechaPasada(new Date("2026-10-24T00:00:00.000Z"))).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RelojSistema } from "./RelojSistema";

describe("RelojSistema.hoy", () => {
  const tzOriginal = process.env.TZ;

  beforeEach(() => {
    // Node relee TZ en caliente: alcanza con fijarla antes de usar Date.
    process.env.TZ = "America/Argentina/Buenos_Aires";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  });

  it("después de las 21:00 en Argentina sigue siendo el día local, no el UTC", () => {
    // 14/09 21:05 en Argentina = 15/09 00:05 UTC. Es la corrida del barrido
    // que mandaba el recordatorio de un turno del 16/09.
    vi.setSystemTime(new Date("2026-09-15T00:05:00Z"));

    expect(new RelojSistema().hoy().toISOString()).toBe(
      "2026-09-14T00:00:00.000Z",
    );
  });

  it("a la mañana coincide con el día UTC", () => {
    vi.setSystemTime(new Date("2026-09-14T12:05:00Z"));

    expect(new RelojSistema().hoy().toISOString()).toBe(
      "2026-09-14T00:00:00.000Z",
    );
  });
});

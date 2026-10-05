import { describe, it, expect, vi } from "vitest";
import { ObtenerResumenCobros } from "./ObtenerResumenCobros";
import { mockEstadisticasRepositorio } from "../_ayudas-test";

function reloj(hoyISO: string) {
  return {
    ahora: () => new Date(`${hoyISO}T15:00:00Z`),
    hoy: () => new Date(hoyISO),
  };
}

const enCero = () => ({ cobrado: 0, pendiente: 0, turnosPendientes: 0 });

describe("ObtenerResumenCobros", () => {
  it("mira la semana de lunes a domingo y todo lo posterior a hoy", async () => {
    const cobrosEntre = vi.fn(async () => enCero());

    // 2026-10-07 es miércoles.
    const resumen = await new ObtenerResumenCobros(
      mockEstadisticasRepositorio({ cobrosEntre }),
      reloj("2026-10-07"),
    ).ejecutar();

    expect(cobrosEntre).toHaveBeenCalledWith(
      new Date("2026-10-05"),
      new Date("2026-10-11"),
    );
    expect(cobrosEntre).toHaveBeenCalledWith(new Date("2026-10-08"), null);
    expect(resumen.semana.desde).toEqual(new Date("2026-10-05"));
    expect(resumen.semana.hasta).toEqual(new Date("2026-10-11"));
  });

  it("un domingo es el último día de su semana, no el primero", async () => {
    const cobrosEntre = vi.fn(async () => enCero());

    await new ObtenerResumenCobros(
      mockEstadisticasRepositorio({ cobrosEntre }),
      reloj("2026-10-11"),
    ).ejecutar();

    expect(cobrosEntre).toHaveBeenCalledWith(
      new Date("2026-10-05"),
      new Date("2026-10-11"),
    );
  });

  it("devuelve lo pagado por adelantado y lo pendiente a futuro", async () => {
    const cobrosEntre = vi.fn(async (_desde: Date, hasta: Date | null) =>
      hasta === null
        ? { cobrado: 20000, pendiente: 45000, turnosPendientes: 3 }
        : { cobrado: 30000, pendiente: 15000, turnosPendientes: 1 },
    );

    const resumen = await new ObtenerResumenCobros(
      mockEstadisticasRepositorio({ cobrosEntre }),
      reloj("2026-10-07"),
    ).ejecutar();

    expect(resumen.futuro).toEqual({
      cobrado: 20000,
      pendiente: 45000,
      turnosPendientes: 3,
    });
    expect(resumen.semana.pendiente).toBe(15000);
    expect(resumen.semana.cobrado).toBe(30000);
  });
});

import { describe, it, expect, vi } from "vitest";
import { ObtenerEstadisticas } from "./ObtenerEstadisticas";
import { mockEstadisticasRepositorio } from "../_ayudas-test";

const DESDE = new Date("2026-06-01");
const HASTA = new Date("2026-07-01");

describe("ObtenerEstadisticas", () => {
  it("deriva pendientes, total y tasa de asistencia", async () => {
    const repo = mockEstadisticasRepositorio({
      obtener: vi.fn(async () => ({
        pacientesActivos: 20,
        pacientesNuevos: 3,
        pacientesEnRiesgo: 2,
        turnosPorEstado: {
          PENDIENTE: 4,
          CONFIRMADO: 2,
          CANCELADO: 3,
          COMPLETADO: 9,
        },
        ingresoCobrado: 120000,
        ingresoPendiente: 30000,
        serieMensual: [{ mes: "2026-07", total: 10, completados: 8 }],
      })),
    });

    const r = await new ObtenerEstadisticas(repo).ejecutar(DESDE, HASTA);

    expect(r.turnos.pendientes).toBe(6); // 4 + 2
    expect(r.turnos.total).toBe(18); // 6 + 3 + 9
    // asistencia = 9 / (9 + 3) = 75%
    expect(r.tasaAsistencia).toBe(75);
    expect(r.ingresos).toEqual({ cobrado: 120000, pendiente: 30000 });
    expect(r.serieMensual).toHaveLength(1);
    expect(r.diasAbandono).toBe(60);
  });

  it("evita dividir por cero cuando no hay turnos cerrados", async () => {
    const repo = mockEstadisticasRepositorio(); // todo en cero
    const r = await new ObtenerEstadisticas(repo).ejecutar(DESDE, HASTA);
    expect(r.tasaAsistencia).toBe(0);
    expect(r.turnos.total).toBe(0);
  });

  it("pide el umbral de abandono 60 días antes de `hasta`", async () => {
    const obtener = vi.fn(async () => ({
      pacientesActivos: 0,
      pacientesNuevos: 0,
      pacientesEnRiesgo: 0,
      turnosPorEstado: {
        PENDIENTE: 0,
        CONFIRMADO: 0,
        CANCELADO: 0,
        COMPLETADO: 0,
      },
      ingresoCobrado: 0,
      ingresoPendiente: 0,
      serieMensual: [],
    }));
    const repo = mockEstadisticasRepositorio({ obtener });

    await new ObtenerEstadisticas(repo).ejecutar(DESDE, HASTA);

    const esperado = new Date(HASTA.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(obtener).toHaveBeenCalledWith(
      expect.objectContaining({ sinActividadDesde: esperado, meses: 6 }),
    );
  });
});

import { describe, it, expect } from "vitest";
import { ObtenerDetalleEstadistica } from "./ObtenerDetalleEstadistica";
import { mockEstadisticasRepositorio } from "../_ayudas-test";
import type { IEstadisticasRepositorio } from "@/dominio/repositorios/IEstadisticasRepositorio";
import { vi } from "vitest";

/**
 * Este caso de uso no calcula: traduce. Todo su valor está en los parámetros
 * que arma, así que eso es lo que miran los tests —y no el arreglo que
 * devuelve, que es el del repositorio tal cual.
 */
describe("ObtenerDetalleEstadistica", () => {
  const desde = new Date("2026-06-01T00:00:00Z");
  const hasta = new Date("2026-08-30T00:00:00Z");

  function armar() {
    const listarPacientes = vi.fn<IEstadisticasRepositorio["listarPacientes"]>(
      async () => [],
    );
    const repositorio = mockEstadisticasRepositorio({ listarPacientes });
    return {
      caso: new ObtenerDetalleEstadistica(repositorio),
      listarPacientes,
      parametros: () => listarPacientes.mock.calls[0]![1],
    };
  }

  it("calcula el corte de abandono 60 días antes del FIN del rango", async () => {
    const { caso, parametros } = armar();

    await caso.ejecutar("EN_RIESGO", desde, hasta);

    // 60 días antes del 30/08 es el 01/07: la pregunta es "quién no aparece
    // hace dos meses A HOY", no "quién no apareció en los dos meses previos al
    // inicio del rango". Contra `desde` la lista traería gente que sí volvió.
    expect(parametros().sinActividadDesde).toEqual(
      new Date("2026-07-01T00:00:00Z"),
    );
  });

  it("usa el mismo umbral de abandono para cualquier tipo de detalle", async () => {
    // El drill-down tiene que dar la misma gente que la tarjeta que se clickeó.
    // Si los umbrales se separaran, la tarjeta diría 7 y la lista mostraría 5.
    for (const tipo of ["EN_RIESGO", "NUEVOS", "ACTIVOS"] as const) {
      const { caso, listarPacientes, parametros } = armar();
      await caso.ejecutar(tipo, desde, hasta);
      expect(listarPacientes.mock.calls[0]![0]).toBe(tipo);
      expect(parametros().sinActividadDesde).toEqual(
        new Date("2026-07-01T00:00:00Z"),
      );
      expect(parametros().meses).toBe(6);
    }
  });

  it("pasa el rango sin tocarlo", async () => {
    const { caso, parametros } = armar();

    await caso.ejecutar("NUEVOS", desde, hasta);

    expect(parametros().desde).toBe(desde);
    expect(parametros().hasta).toBe(hasta);
  });

  it("devuelve lo que da el repositorio, sin filtrar ni reordenar", async () => {
    const pacientes = [
      { id: "p2", nombre: "Beto", apellido: "Suárez", referencia: null },
      {
        id: "p1",
        nombre: "Ana",
        apellido: "García",
        referencia: new Date("2026-05-01T00:00:00Z"),
      },
    ];
    const caso = new ObtenerDetalleEstadistica(
      mockEstadisticasRepositorio({
        listarPacientes: vi.fn(async () => pacientes),
      }),
    );

    // El orden lo decide la consulta SQL, que ordena por la fecha de
    // referencia de cada categoría. Reordenar acá rompería ese criterio.
    await expect(caso.ejecutar("ACTIVOS", desde, hasta)).resolves.toEqual(
      pacientes,
    );
  });
});

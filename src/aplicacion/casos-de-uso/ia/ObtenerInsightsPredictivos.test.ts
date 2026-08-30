import { describe, it, expect, vi } from "vitest";
import { ObtenerInsightsPredictivos } from "./ObtenerInsightsPredictivos";
import { mockAnalisisPredictivo } from "../_ayudas-test";
import type { InsightPaciente } from "@/dominio/servicios/IAnalisisPredictivo";

/**
 * El caso de uso es una línea, y ese es justamente el punto: existe para que
 * la capa de arriba dependa del PUERTO y no del stub de demostración que hoy
 * lo implementa. Lo que se protege acá es que siga siendo una línea —el día
 * que alguien le agregue un filtro o un orden, el modelo real y el stub
 * dejarían de ser intercambiables.
 */
describe("ObtenerInsightsPredictivos", () => {
  it("devuelve los insights del servicio tal como vienen", async () => {
    const insights: InsightPaciente[] = [
      {
        tipo: "ABANDONO",
        titulo: "Riesgo de abandono",
        detalle: "Sin turnos hace 45 días.",
        severidad: "CRITICO",
        pacienteId: "pac-1",
      },
      {
        tipo: "TENDENCIA",
        titulo: "Buena adherencia general",
        detalle: "El 80 % registró comidas esta semana.",
        severidad: "INFO",
        pacienteId: null,
      },
    ];
    const caso = new ObtenerInsightsPredictivos(
      mockAnalisisPredictivo({ insights: vi.fn(async () => insights) }),
    );

    // Sin reordenar por severidad: el orden es parte de lo que el modelo
    // decide, y la pantalla es la que elige cómo mostrarlo.
    await expect(caso.ejecutar()).resolves.toEqual(insights);
  });

  it("acepta una lista vacía sin inventar una tarjeta de relleno", async () => {
    const caso = new ObtenerInsightsPredictivos(mockAnalisisPredictivo());

    // "No hay nada que señalar" es una respuesta válida y la pantalla sabe
    // dibujarla. Devolver un insight informativo de relleno desde acá haría
    // que el vacío fuera indistinguible de un hallazgo real.
    await expect(caso.ejecutar()).resolves.toEqual([]);
  });

  it("propaga el fallo del análisis en vez de devolver vacío", async () => {
    const caso = new ObtenerInsightsPredictivos(
      mockAnalisisPredictivo({
        insights: vi.fn(() => Promise.reject(new Error("modelo caído"))),
      }),
    );

    // Tragarse el error mostraría un panel vacío, que el profesional leería
    // como "no hay pacientes en riesgo" cuando en realidad nadie los buscó.
    await expect(caso.ejecutar()).rejects.toThrow("modelo caído");
  });
});

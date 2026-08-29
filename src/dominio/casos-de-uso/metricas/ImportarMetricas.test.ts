import { describe, it, expect } from "vitest";
import { ImportarMetricas } from "./ImportarMetricas";
import { mockMetricaDispositivoRepositorio } from "../_ayudas-test";

describe("ImportarMetricas", () => {
  it("guarda una métrica por día y devuelve la cantidad", async () => {
    const metricas = mockMetricaDispositivoRepositorio();
    const casoUso = new ImportarMetricas(metricas);

    const cantidad = await casoUso.ejecutar("pac-1", [
      {
        fecha: new Date("2026-07-10"),
        fuente: "APPLE_WATCH",
        pasos: 9000,
        horasSueno: 7,
      },
      { fecha: new Date("2026-07-11"), fuente: "APPLE_WATCH", pasos: 5000 },
    ]);

    expect(cantidad).toBe(2);
    expect(metricas.guardar).toHaveBeenCalledTimes(2);
  });
});

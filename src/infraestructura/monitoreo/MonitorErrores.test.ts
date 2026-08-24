import { describe, it, expect, vi } from "vitest";
import type { IMonitorErrores } from "@/dominio/servicios/IMonitorErrores";
import { describirError } from "./MonitorErroresConsola";
import { MonitorErroresCompuesto } from "./MonitorErroresCompuesto";

describe("describirError", () => {
  it("normaliza un Error a { nombre, mensaje, stack }", () => {
    const d = describirError(new TypeError("boom"));
    expect(d.nombre).toBe("TypeError");
    expect(d.mensaje).toBe("boom");
    expect(d.stack).toContain("boom");
  });

  it("normaliza un valor no-Error (string)", () => {
    const d = describirError("falló feo");
    expect(d.nombre).toBe("NoError");
    expect(d.mensaje).toBe("falló feo");
  });
});

describe("MonitorErroresCompuesto", () => {
  it("reenvía la captura a todos los destinos", () => {
    const a: IMonitorErrores = { capturar: vi.fn() };
    const b: IMonitorErrores = { capturar: vi.fn() };
    const compuesto = new MonitorErroresCompuesto([a, b]);

    const err = new Error("x");
    compuesto.capturar(err, { origen: "test" });

    expect(a.capturar).toHaveBeenCalledWith(err, { origen: "test" });
    expect(b.capturar).toHaveBeenCalledWith(err, { origen: "test" });
  });

  it("un destino que lanza no impide llegar a los demás", () => {
    const roto: IMonitorErrores = {
      capturar: vi.fn(() => {
        throw new Error("destino roto");
      }),
    };
    const sano: IMonitorErrores = { capturar: vi.fn() };
    const compuesto = new MonitorErroresCompuesto([roto, sano]);

    expect(() => compuesto.capturar(new Error("x"))).not.toThrow();
    expect(sano.capturar).toHaveBeenCalledTimes(1);
  });
});

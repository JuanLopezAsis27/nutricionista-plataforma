import { describe, it, expect, vi } from "vitest";
import type { IMonitorErrores } from "@/dominio/servicios/IMonitorErrores";
import {
  describirError,
  truncarMensaje,
  truncarStack,
  MonitorErroresConsola,
} from "./MonitorErroresConsola";
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

describe("truncarMensaje", () => {
  it("deja igual un mensaje corto", () => {
    expect(truncarMensaje("boom")).toBe("boom");
  });

  it("recorta un mensaje larguísimo y avisa cuánto medía", () => {
    const largo = "x".repeat(600);
    const resultado = truncarMensaje(largo);
    expect(resultado.length).toBeLessThan(largo.length);
    expect(resultado).toContain("600 caracteres, truncado");
  });
});

describe("truncarStack", () => {
  it("deja igual un stack de pocas líneas", () => {
    const stack = "Error: boom\n    at a (x.ts:1:1)\n    at b (y.ts:2:2)";
    expect(truncarStack(stack)).toBe(stack);
  });

  it("se queda con las primeras 8 líneas y avisa cuántas omitió", () => {
    const lineas = Array.from(
      { length: 20 },
      (_, i) => `    at f${i} (x.ts:1:1)`,
    );
    const stack = ["Error: boom", ...lineas].join("\n");
    const resultado = truncarStack(stack)!;
    const resultadoLineas = resultado.split("\n");
    // Las primeras 8 líneas del stack original + la línea de aviso.
    expect(resultadoLineas).toHaveLength(9);
    expect(resultadoLineas[8]).toContain("13 líneas más, omitidas");
  });

  it("no rompe si no hay stack", () => {
    expect(truncarStack(undefined)).toBeUndefined();
  });
});

describe("MonitorErroresConsola", () => {
  it("emite la cabecera y el stack en líneas separadas, cada una legible", () => {
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      new MonitorErroresConsola().capturar(new Error("boom"), {
        origen: "test",
      });

      expect(espia).toHaveBeenCalledTimes(2);
      const cabecera = JSON.parse(espia.mock.calls[0]![0] as string);
      expect(cabecera).toMatchObject({
        nivel: "error",
        nombre: "Error",
        mensaje: "boom",
        origen: "test",
      });
      // La cabecera no carga el stack: va aparte, en la segunda línea, con
      // saltos de línea reales (no un string con "\n" escapados).
      expect(cabecera.stack).toBeUndefined();
      const stackImpreso = espia.mock.calls[1]![0] as string;
      expect(stackImpreso).toContain("Error: boom");
      expect(stackImpreso.split("\n").length).toBeGreaterThan(1);
    } finally {
      espia.mockRestore();
    }
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

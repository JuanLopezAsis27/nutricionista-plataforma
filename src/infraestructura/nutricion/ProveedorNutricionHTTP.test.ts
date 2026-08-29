import { describe, it, expect, vi, afterEach } from "vitest";
import { ProveedorNutricionHTTP } from "./ProveedorNutricionHTTP";
import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { ConfigNutricionServicio } from "./configNutricionServicio";

const config: ConfigNutricionServicio = {
  url: "http://servicio/",
  token: "secreto",
  timeoutMs: 8000,
};

const alimentoServicio: AlimentoNutricional = {
  nombre: "Manzana",
  marca: null,
  referenciaExterna: "1",
  fuente: "FATSECRET",
  caloriasPor100: 52,
  proteinasPor100: 0.3,
  carbohidratosPor100: 13.8,
  grasasPor100: 0.2,
};

function respaldoQueDevuelve(fuente: string): IProveedorDatosNutricionales {
  return {
    buscar: vi.fn(async () => [
      {
        nombre: "Respaldo",
        marca: null,
        referenciaExterna: null,
        fuente,
        caloriasPor100: 10,
        proteinasPor100: 1,
        carbohidratosPor100: 1,
        grasasPor100: 1,
      },
    ]),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("ProveedorNutricionHTTP", () => {
  it("usa la respuesta del servicio cuando responde OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ alimentos: [alimentoServicio] }),
      })),
    );
    const respaldo = respaldoQueDevuelve("OFF");
    const p = new ProveedorNutricionHTTP(config, respaldo);

    const r = await p.buscar("manzana");

    expect(r[0]!.nombre).toBe("Manzana");
    expect(r[0]!.fuente).toBe("FATSECRET");
    expect(respaldo.buscar).not.toHaveBeenCalled();
  });

  it("manda el token y el término al servicio", async () => {
    const fetchMock = vi.fn(async (_url: string, _opciones: RequestInit) => ({
      ok: true,
      json: async () => ({ alimentos: [alimentoServicio] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const p = new ProveedorNutricionHTTP(config, respaldoQueDevuelve("OFF"));

    await p.buscar("arroz", 5);

    const [url, opciones] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://servicio/");
    expect(opciones.method).toBe("POST");
    const headers = opciones.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer secreto");
    expect(JSON.parse(opciones.body as string)).toEqual({
      termino: "arroz",
      limite: 5,
    });
  });

  it("cae al respaldo si el servicio responde no-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    const respaldo = respaldoQueDevuelve("OFF");
    const p = new ProveedorNutricionHTTP(config, respaldo);

    const r = await p.buscar("manzana");

    expect(r[0]!.fuente).toBe("OFF");
    expect(respaldo.buscar).toHaveBeenCalledWith("manzana", 10, undefined);
  });

  it("cae al respaldo si el servicio no trae resultados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ alimentos: [] }) })),
    );
    const respaldo = respaldoQueDevuelve("OFF");
    const p = new ProveedorNutricionHTTP(config, respaldo);

    const r = await p.buscar("xyz");
    expect(r[0]!.fuente).toBe("OFF");
  });

  it("cae al respaldo si fetch lanza (red caída / timeout)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );
    const respaldo = respaldoQueDevuelve("OFF");
    const p = new ProveedorNutricionHTTP(config, respaldo);

    const r = await p.buscar("manzana");
    expect(r[0]!.fuente).toBe("OFF");
  });

  it("devuelve [] sin llamar al servicio si el término es muy corto", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const respaldo = respaldoQueDevuelve("OFF");
    const p = new ProveedorNutricionHTTP(config, respaldo);

    expect(await p.buscar("a")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(respaldo.buscar).not.toHaveBeenCalled();
  });
});

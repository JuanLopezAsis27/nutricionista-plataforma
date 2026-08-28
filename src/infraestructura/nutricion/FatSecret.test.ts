import { describe, it, expect, vi, afterEach } from "vitest";
import { ClienteFatSecret } from "./ClienteFatSecret";
import { ProveedorNutricionApp } from "./ProveedorNutricionApp";
import type { IProveedorDatosNutricionales } from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";

const creds = { clientId: "id", clientSecret: "secret" };

function fetchSimulado(cuerpoBusqueda: unknown) {
  return vi.fn(async (url: string) => {
    if (url.includes("connect/token")) {
      return {
        ok: true,
        json: async () => ({ access_token: "tok", expires_in: 86400 }),
      } as unknown as Response;
    }
    return { ok: true, json: async () => cuerpoBusqueda } as unknown as Response;
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("ClienteFatSecret", () => {
  it("parsea macros por 100 g de la búsqueda", async () => {
    vi.stubGlobal(
      "fetch",
      fetchSimulado({
        foods: {
          food: [
            {
              food_id: "1",
              food_name: "Manzana",
              food_description:
                "Per 100g - Calories: 52kcal | Fat: 0.17g | Carbs: 13.81g | Protein: 0.26g",
            },
          ],
        },
      }),
    );

    const r = await new ClienteFatSecret().buscar(creds, "manzana");

    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      nombre: "Manzana",
      fuente: "FATSECRET",
      referenciaExterna: "1",
      caloriasPor100: 52,
      carbohidratosPor100: 13.8,
      proteinasPor100: 0.3,
      grasasPor100: 0.2,
    });
  });

  it("escala a 100 g cuando la porción está en gramos", async () => {
    vi.stubGlobal(
      "fetch",
      fetchSimulado({
        foods: {
          food: {
            food_id: "2",
            food_name: "Barrita",
            food_description:
              "Per 1 serving (30 g) - Calories: 60kcal | Fat: 3g | Carbs: 6g | Protein: 2g",
          },
        },
      }),
    );

    const r = await new ClienteFatSecret().buscar(creds, "barrita");
    expect(r[0]!.caloriasPor100).toBe(200); // 60 × (100/30)
    expect(r[0]!.grasasPor100).toBe(10);
    expect(r[0]!.proteinasPor100).toBeCloseTo(6.7, 1);
  });

  it("devuelve [] si el token falla", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false }) as unknown as Response));
    expect(await new ClienteFatSecret().buscar(creds, "algo")).toEqual([]);
  });
});

describe("ProveedorNutricionApp", () => {
  const off: IProveedorDatosNutricionales = {
    buscar: vi.fn(async () => [
      {
        nombre: "OFF",
        marca: null,
        referenciaExterna: null,
        fuente: "OFF",
        caloriasPor100: 10,
        proteinasPor100: 1,
        carbohidratosPor100: 1,
        grasasPor100: 1,
      },
    ]),
  };
  const fatFake = {
    buscar: vi.fn(async () => [
      {
        nombre: "FAT",
        marca: null,
        referenciaExterna: "x",
        fuente: "FATSECRET",
        caloriasPor100: 20,
        proteinasPor100: 2,
        carbohidratosPor100: 2,
        grasasPor100: 2,
      },
    ]),
  } as unknown as ClienteFatSecret;

  function repo(clientId: string | null): ICredencialesIntegracionRepositorio {
    return {
      obtener: async () => ({
        proveedorIA: null,
        anthropicApiKey: null,
        anthropicModelo: null,
        fatsecretClientId: clientId,
        whatsappToken: null,
      whatsappPhoneNumberId: null,
      whatsappVerifyToken: null,
      whatsappAppSecret: null,
      fatsecretClientSecret: clientId ? "sec" : null,
        criterios: {
          excluirMarcas: false,
          requiereMacros: false,
          maxCaloriasPor100: null,
          excluirTexto: [],
        },
      }),
      guardar: async () => {},
    };
  }

  it("usa FatSecret si el inquilino tiene credenciales", async () => {
    const p = new ProveedorNutricionApp(repo("id"), fatFake, off, null);
    const r = await p.buscar("arroz");
    expect(r[0]!.fuente).toBe("FATSECRET");
  });

  it("cae a Open Food Facts si no hay credenciales de FatSecret", async () => {
    const p = new ProveedorNutricionApp(repo(null), fatFake, off, null);
    const r = await p.buscar("arroz");
    expect(r[0]!.fuente).toBe("OFF");
  });

  it("cae a OFF si FatSecret no trae resultados", async () => {
    const fatVacio = { buscar: vi.fn(async () => []) } as unknown as ClienteFatSecret;
    const p = new ProveedorNutricionApp(repo("id"), fatVacio, off, null);
    const r = await p.buscar("xyz");
    expect(r[0]!.fuente).toBe("OFF");
  });

  it("traduce la consulta y los nombres cuando hay traductor", async () => {
    const traductor = {
      aIngles: vi.fn(async (t: string) => (t === "manzana" ? "apple" : t)),
      aEspanol: vi.fn(async (n: string[]) => n.map((x) => (x === "FAT" ? "Manzana" : x))),
    };
    const p = new ProveedorNutricionApp(repo("id"), fatFake, off, null, traductor);
    const r = await p.buscar("manzana");

    expect(traductor.aIngles).toHaveBeenCalledWith("manzana");
    expect(fatFake.buscar).toHaveBeenCalledWith(
      { clientId: "id", clientSecret: "sec" },
      "apple",
      10,
    );
    expect(r[0]!.nombre).toBe("Manzana");
  });

  it("aplica el criterio del nutri sobre los resultados de FatSecret", async () => {
    const fatConMarca = {
      buscar: vi.fn(async () => [
        {
          nombre: "Con marca",
          marca: "Gallo",
          referenciaExterna: null,
          fuente: "FATSECRET",
          caloriasPor100: 100,
          proteinasPor100: 1,
          carbohidratosPor100: 1,
          grasasPor100: 1,
        },
        {
          nombre: "Genérico",
          marca: null,
          referenciaExterna: null,
          fuente: "FATSECRET",
          caloriasPor100: 100,
          proteinasPor100: 1,
          carbohidratosPor100: 1,
          grasasPor100: 1,
        },
      ]),
    } as unknown as ClienteFatSecret;

    const p = new ProveedorNutricionApp(repo("id"), fatConMarca, off, null);
    const r = await p.buscar("arroz", 10, {
      excluirMarcas: true,
      requiereMacros: false,
      maxCaloriasPor100: null,
      excluirTexto: [],
    });

    expect(r.map((x) => x.nombre)).toEqual(["Genérico"]);
  });
});

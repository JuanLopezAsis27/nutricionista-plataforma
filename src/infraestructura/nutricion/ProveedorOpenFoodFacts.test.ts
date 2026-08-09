import { describe, it, expect, vi, afterEach } from "vitest";
import { ProveedorOpenFoodFacts } from "./ProveedorOpenFoodFacts";

const config = { baseUrl: "https://es.openfoodfacts.org" };

function respuestaOk(cuerpo: unknown) {
  return { ok: true, json: async () => cuerpo } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProveedorOpenFoodFacts", () => {
  it("mapea los productos de Open Food Facts a alimentos con macros por 100 g", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respuestaOk({
          products: [
            {
              product_name_es: "Arroz blanco",
              brands: "Marca X, Otra",
              code: "123",
              nutriments: {
                "energy-kcal_100g": 350,
                proteins_100g: 7,
                carbohydrates_100g: 78,
                fat_100g: 0.6,
              },
            },
          ],
        }),
      ),
    );

    const proveedor = new ProveedorOpenFoodFacts(config);
    const resultados = await proveedor.buscar("arroz");

    expect(resultados).toHaveLength(1);
    expect(resultados[0]).toEqual({
      nombre: "Arroz blanco",
      marca: "Marca X",
      referenciaExterna: "123",
      fuente: "OFF",
      caloriasPor100: 350,
      proteinasPor100: 7,
      carbohidratosPor100: 78,
      grasasPor100: 0.6,
    });
  });

  it("descarta productos sin nombre o sin ningún macro útil", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respuestaOk({
          products: [
            { product_name: "", nutriments: { "energy-kcal_100g": 100 } }, // sin nombre
            { product_name: "Agua", nutriments: {} }, // sin macros
          ],
        }),
      ),
    );

    const proveedor = new ProveedorOpenFoodFacts(config);
    expect(await proveedor.buscar("agua")).toEqual([]);
  });

  it("devuelve [] si la búsqueda falla (degradación)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("red caída");
      }),
    );

    const proveedor = new ProveedorOpenFoodFacts(config);
    expect(await proveedor.buscar("pollo")).toEqual([]);
  });

  it("no llama a la red con términos demasiado cortos", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const proveedor = new ProveedorOpenFoodFacts(config);
    expect(await proveedor.buscar("a")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

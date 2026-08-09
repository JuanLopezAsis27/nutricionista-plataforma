import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { ConfigNutricion } from "./configNutricion";

/** Forma (parcial) de un producto en la respuesta de Open Food Facts. */
interface ProductoOFF {
  product_name?: string;
  product_name_es?: string;
  generic_name?: string;
  generic_name_es?: string;
  brands?: string;
  code?: string;
  nutriments?: Record<string, number | string | undefined>;
}

interface RespuestaBusquedaOFF {
  products?: ProductoOFF[];
}

const TIEMPO_LIMITE_MS = 7000;

/**
 * Adaptador del puerto de datos nutricionales contra Open Food Facts (búsqueda
 * de texto libre, macros por 100 g). Gratuito y sin API key. Corre en el
 * servidor (evita CORS). Ante error o timeout devuelve [] (degradación).
 */
export class ProveedorOpenFoodFacts implements IProveedorDatosNutricionales {
  constructor(private readonly config: ConfigNutricion) {}

  async buscar(termino: string, limite = 10): Promise<AlimentoNutricional[]> {
    const consulta = termino.trim();
    if (consulta.length < 2) return [];

    const url = this.construirUrl(consulta, limite);
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
    try {
      const respuesta = await fetch(url, {
        method: "GET",
        headers: {
          // Open Food Facts pide identificar el cliente (buena práctica de su API).
          "User-Agent": "nutricionista-app/1.0 (recetario)",
          Accept: "application/json",
        },
        signal: controlador.signal,
      });
      if (!respuesta.ok) return [];
      const datos = (await respuesta.json()) as RespuestaBusquedaOFF;
      const productos = datos.products ?? [];
      return productos
        .map((p) => this.mapear(p))
        .filter((a): a is AlimentoNutricional => a !== null)
        .slice(0, limite);
    } catch {
      // Red caída, timeout o JSON inválido → sin resultados (se carga a mano).
      return [];
    } finally {
      clearTimeout(temporizador);
    }
  }

  private construirUrl(termino: string, limite: number): string {
    const params = new URLSearchParams({
      search_terms: termino,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: String(Math.min(Math.max(limite, 1), 25)),
      fields: "product_name,product_name_es,generic_name,generic_name_es,brands,code,nutriments",
    });
    return `${this.config.baseUrl}/cgi/search.pl?${params.toString()}`;
  }

  private mapear(p: ProductoOFF): AlimentoNutricional | null {
    const nombre = (
      p.product_name_es ||
      p.product_name ||
      p.generic_name_es ||
      p.generic_name ||
      ""
    ).trim();
    if (nombre.length === 0) return null;

    const n = p.nutriments ?? {};
    const alimento: AlimentoNutricional = {
      nombre,
      marca: (p.brands ?? "").split(",")[0]?.trim() || null,
      referenciaExterna: p.code?.trim() || null,
      fuente: "OFF",
      caloriasPor100: numero(n["energy-kcal_100g"]),
      proteinasPor100: numero(n["proteins_100g"]),
      carbohidratosPor100: numero(n["carbohydrates_100g"]),
      grasasPor100: numero(n["fat_100g"]),
    };

    // Descarta productos sin ningún macro útil (no aportan al cálculo).
    const sinDatos =
      alimento.caloriasPor100 == null &&
      alimento.proteinasPor100 == null &&
      alimento.carbohidratosPor100 == null &&
      alimento.grasasPor100 == null;
    return sinDatos ? null : alimento;
  }
}

/** Convierte un valor de nutriments (number|string) a number no negativo o null. */
function numero(valor: number | string | undefined): number | null {
  if (valor == null || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10) / 10;
}

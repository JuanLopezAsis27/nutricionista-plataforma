import type { AlimentoNutricional } from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { ConfigFatSecret } from "./configFatSecret";

const URL_TOKEN = "https://oauth.fatsecret.com/connect/token";
const URL_API = "https://platform.fatsecret.com/rest/server.api";
const TIEMPO_LIMITE_MS = 7000;

interface FoodFatSecret {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_description?: string;
}

/**
 * Cliente de FatSecret Platform (OAuth2 client credentials). Obtiene un token
 * (cacheado por client_id) y busca alimentos, parseando los macros por 100 g
 * del `food_description`. Ante cualquier fallo devuelve [] (degradación).
 */
export class ClienteFatSecret {
  private readonly tokens = new Map<
    string,
    { token: string; expira: number }
  >();

  async buscar(
    creds: ConfigFatSecret,
    termino: string,
    limite = 10,
  ): Promise<AlimentoNutricional[]> {
    const consulta = termino.trim();
    if (consulta.length < 2) return [];

    try {
      const token = await this.token(creds);
      if (!token) return [];

      const params = new URLSearchParams({
        method: "foods.search",
        search_expression: consulta,
        format: "json",
        max_results: String(Math.min(Math.max(limite, 1), 20)),
      });
      const respuesta = await fetch(`${URL_API}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      });
      if (!respuesta.ok) return [];

      const datos = (await respuesta.json()) as {
        foods?: { food?: FoodFatSecret | FoodFatSecret[] };
      };
      const foods = normalizarLista(datos.foods?.food);
      return foods
        .map(parsear)
        .filter((a): a is AlimentoNutricional => a !== null)
        .slice(0, limite);
    } catch {
      return [];
    }
  }

  private async token(creds: ConfigFatSecret): Promise<string | null> {
    const cache = this.tokens.get(creds.clientId);
    if (cache && cache.expira > Date.now() + 60_000) return cache.token;

    const basic = Buffer.from(
      `${creds.clientId}:${creds.clientSecret}`,
    ).toString("base64");
    const respuesta = await fetch(URL_TOKEN, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=basic",
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    if (!respuesta.ok) return null;

    const j = (await respuesta.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!j.access_token) return null;
    this.tokens.set(creds.clientId, {
      token: j.access_token,
      expira: Date.now() + (j.expires_in ?? 86400) * 1000,
    });
    return j.access_token;
  }
}

function normalizarLista(
  food: FoodFatSecret | FoodFatSecret[] | undefined,
): FoodFatSecret[] {
  if (!food) return [];
  return Array.isArray(food) ? food : [food];
}

/** Parsea el `food_description` a macros por 100 g. Null si no hay datos útiles. */
function parsear(food: FoodFatSecret): AlimentoNutricional | null {
  const nombre = (food.food_name ?? "").trim();
  const desc = food.food_description ?? "";
  if (nombre.length === 0) return null;

  const kcal = extraer(desc, /Calories:\s*([\d.]+)\s*kcal/i);
  const grasas = extraer(desc, /Fat:\s*([\d.]+)\s*g/i);
  const carbos = extraer(desc, /Carbs:\s*([\d.]+)\s*g/i);
  const proteinas = extraer(desc, /Protein:\s*([\d.]+)\s*g/i);
  if (kcal == null && grasas == null && carbos == null && proteinas == null)
    return null;

  // Escala a 100 g según la porción indicada ("Per 100g" o "(30 g)").
  const gramos =
    extraer(desc, /Per\s+([\d.]+)\s*g\b/i) ??
    extraer(desc, /\(([\d.]+)\s*g\)/i) ??
    100;
  const factor = gramos > 0 ? 100 / gramos : 1;

  return {
    nombre,
    marca: food.brand_name?.trim() || null,
    referenciaExterna: food.food_id?.trim() || null,
    fuente: "FATSECRET",
    caloriasPor100: escalar(kcal, factor),
    proteinasPor100: escalar(proteinas, factor),
    carbohidratosPor100: escalar(carbos, factor),
    grasasPor100: escalar(grasas, factor),
  };
}

function extraer(texto: string, patron: RegExp): number | null {
  const m = texto.match(patron);
  if (!m || !m[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function escalar(valor: number | null, factor: number): number | null {
  return valor == null ? null : Math.round(valor * factor * 10) / 10;
}

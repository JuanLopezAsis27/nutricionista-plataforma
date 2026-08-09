import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { ConfigNutricionServicio } from "./configNutricionServicio";

/**
 * Proveedor que delega la búsqueda de alimentos al microservicio externo de
 * nutrición (Go/Lambda): éste consulta FatSecret, traduce ES↔EN y filtra. La app
 * solo transporta el término.
 *
 * Degradación elegante: ante error de red, respuesta no-OK, timeout o cero
 * resultados, cae al `respaldo` (el proveedor local, que resuelve FatSecret por
 * inquilino o cae a Open Food Facts). Nunca lanza por fallo del servicio.
 */
export class ProveedorNutricionHTTP implements IProveedorDatosNutricionales {
  constructor(
    private readonly config: ConfigNutricionServicio,
    private readonly respaldo: IProveedorDatosNutricionales,
  ) {}

  async buscar(
    termino: string,
    limite = 10,
    criterio?: CriterioAlimentos,
  ): Promise<AlimentoNutricional[]> {
    const t = termino.trim();
    if (t.length < 2) return [];

    try {
      const cabeceras: Record<string, string> = { "content-type": "application/json" };
      if (this.config.token) cabeceras["authorization"] = `Bearer ${this.config.token}`;

      const resp = await fetch(this.config.url, {
        method: "POST",
        headers: cabeceras,
        body: JSON.stringify({ termino: t, limite, criterio }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!resp.ok) return this.respaldo.buscar(termino, limite, criterio);

      const datos = (await resp.json()) as { alimentos?: unknown };
      const crudos = Array.isArray(datos.alimentos) ? datos.alimentos : [];
      if (crudos.length === 0) return this.respaldo.buscar(termino, limite, criterio);

      return crudos.map((a) => normalizar(a)).slice(0, limite);
    } catch {
      return this.respaldo.buscar(termino, limite, criterio);
    }
  }
}

/** Mapea defensivamente la respuesta del servicio al shape del dominio. */
function normalizar(crudo: unknown): AlimentoNutricional {
  const o = (crudo ?? {}) as Record<string, unknown>;
  return {
    nombre: typeof o.nombre === "string" ? o.nombre : "",
    marca: typeof o.marca === "string" ? o.marca : null,
    referenciaExterna: typeof o.referenciaExterna === "string" ? o.referenciaExterna : null,
    fuente: typeof o.fuente === "string" ? o.fuente : "FATSECRET",
    caloriasPor100: numeroONulo(o.caloriasPor100),
    proteinasPor100: numeroONulo(o.proteinasPor100),
    carbohidratosPor100: numeroONulo(o.carbohidratosPor100),
    grasasPor100: numeroONulo(o.grasasPor100),
  };
}

function numeroONulo(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";

/**
 * Caso de uso: varias recetas por id, en UNA lectura.
 *
 * Es para lo que ya apunta a recetas, como las opciones de un plan cuyo PDF
 * las imprime: pedirlas de a una era una consulta (y una por relación) por
 * receta, y en el respaldo eso se repetía por cada plan.
 *
 * Devuelve las que existen en el orden en que se pidieron, sin repetir; las
 * que ya no están (o son de otro consultorio) se omiten sin error, al revés
 * que `ObtenerRecetaPorId`: un plan que nombra una receta borrada se sigue
 * imprimiendo.
 */
export class ObtenerRecetasPorIds {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(ids: readonly string[]): Promise<Receta[]> {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) return [];
    const porId = new Map(
      (await this.recetas.obtenerPorIds(unicos)).map((r) => [r.id, r]),
    );
    return unicos.flatMap((id) => porId.get(id) ?? []);
  }
}

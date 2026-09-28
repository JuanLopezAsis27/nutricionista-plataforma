import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";
import {
  macrosDeOpcion,
  type DatosItemOpcion,
  type ItemDeOpcion,
} from "@/dominio/entidades/PlanNutricional";
import type { MetasDiarias } from "@/dominio/servicios/comparacionMacros";
import {
  mejoresCombinaciones,
  type ResultadoCombinaciones,
} from "@/dominio/servicios/combinacionesPlan";

/** Una opción del borrador: solo lo que hace falta para sumarla. */
export interface OpcionBorrador {
  recetaId?: string | null;
  porciones?: number | null;
  items?: DatosItemOpcion[];
}

export interface BorradorPlan {
  comidas: { nombre: string; opciones: OpcionBorrador[] }[];
  metas: MetasDiarias | null;
}

/** Un alimento suelto que ya es ingrediente de la receta de la misma opción. */
export interface AvisoDuplicado {
  franja: string;
  opcion: number;
  alimento: string;
  receta: string;
}

export interface EvaluacionPlan extends ResultadoCombinaciones {
  avisos: AvisoDuplicado[];
}

/**
 * Caso de uso: las combinaciones del plan que se está EDITANDO que mejor
 * cumplen sus metas diarias, sin guardarlo.
 *
 * Trabaja sobre el borrador y no sobre un plan persistido porque es en la
 * edición donde sirve: el profesional cambia una opción y quiere ver si el día
 * sigue cerrando. Las recetas se leen del recetario (sus macros por porción
 * salen de SUS ingredientes, ya calculados al guardarla) y cada opción suma
 * receta × porciones + alimentos sueltos, con la misma regla que el plan
 * guardado (`macrosDeOpcion`).
 *
 * Además avisa cuando un alimento suelto de una opción también es ingrediente
 * de la receta de esa opción: la cuenta no lo suma dos veces por error —la
 * receta entra por sus macros, nunca por sus ingredientes—, pero un
 * profesional que cargó "huevo" arriba y la receta ya lo trae probablemente
 * lo está contando de más. Es un aviso y no un error: un huevo extra puede
 * ser justamente lo que quiso.
 */
export class EvaluarCombinacionesPlan {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(borrador: BorradorPlan): Promise<EvaluacionPlan> {
    const recetas = await this.leerRecetas(borrador);
    const avisos: AvisoDuplicado[] = [];

    const franjas = borrador.comidas.map((comida) => ({
      nombre: comida.nombre.trim() || "Sin nombre",
      opciones: comida.opciones.map((opcion, indice) => {
        const receta = opcion.recetaId
          ? (recetas.get(opcion.recetaId) ?? null)
          : null;
        const items = (opcion.items ?? []).map(aItem);
        if (receta) {
          for (const alimento of repetidosEnReceta(items, receta)) {
            avisos.push({
              franja: comida.nombre,
              opcion: indice + 1,
              alimento,
              receta: receta.nombre,
            });
          }
        }
        return {
          numero: indice + 1,
          macros: macrosDeOpcion({
            items,
            recetaMacros: receta ? macrosPorPorcion(receta) : null,
            porciones: opcion.porciones ?? null,
          }),
        };
      }),
    }));

    return { ...mejoresCombinaciones(franjas, borrador.metas), avisos };
  }

  /**
   * Una lectura por receta distinta. Una que ya no existe (o es de otro
   * consultorio: el repositorio filtra por inquilino) simplemente no aporta.
   */
  private async leerRecetas(
    borrador: BorradorPlan,
  ): Promise<Map<string, Receta>> {
    const ids = new Set<string>();
    for (const comida of borrador.comidas) {
      for (const opcion of comida.opciones) {
        if (opcion.recetaId) ids.add(opcion.recetaId);
      }
    }
    const recetas = new Map<string, Receta>();
    await Promise.all(
      [...ids].map(async (id) => {
        const receta = await this.recetas.obtenerPorId(id);
        if (receta) recetas.set(id, receta);
      }),
    );
    return recetas;
  }
}

function aItem(item: DatosItemOpcion): ItemDeOpcion {
  return {
    nombre: item.nombre,
    cantidadGramos: item.cantidadGramos ?? null,
    caloriasPor100: item.caloriasPor100 ?? null,
    proteinasPor100: item.proteinasPor100 ?? null,
    carbohidratosPor100: item.carbohidratosPor100 ?? null,
    grasasPor100: item.grasasPor100 ?? null,
    fuente: item.fuente ?? null,
    referenciaExterna: item.referenciaExterna ?? null,
    alimentoOrigenId: item.alimentoOrigenId ?? null,
  };
}

function macrosPorPorcion(receta: Receta) {
  const p = receta.aPrimitivos();
  return {
    calorias: p.calorias,
    proteinasG: p.proteinasG,
    carbohidratosG: p.carbohidratosG,
    grasasG: p.grasasG,
  };
}

/**
 * Nombres de los alimentos sueltos que se parecen a un ingrediente de la
 * receta. "Se parecen" es que uno contenga al otro sin mayúsculas ni tildes:
 * «Huevo» y «huevo entero» son el mismo alimento para el que lee el plan.
 */
export function repetidosEnReceta(
  items: ReadonlyArray<{ nombre: string }>,
  receta: Receta,
): string[] {
  const ingredientes = receta
    .aPrimitivos()
    .ingredientes.map((i) => normalizar(i.nombre))
    .filter((n) => n.length >= 3);
  return items
    .filter((item) => {
      const nombre = normalizar(item.nombre);
      if (nombre.length < 3) return false;
      return ingredientes.some(
        (ing) => ing.includes(nombre) || nombre.includes(ing),
      );
    })
    .map((item) => item.nombre);
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

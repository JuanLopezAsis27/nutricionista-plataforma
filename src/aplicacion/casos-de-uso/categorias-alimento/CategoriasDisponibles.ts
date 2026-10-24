import type { ICategoriaAlimentoRepositorio } from "@/dominio/repositorios/ICategoriaAlimentoRepositorio";
import type { CategoriaDeAlimento } from "@/dominio/entidades/CategoriaAlimento";
import { ErrorCategoriaAlimentoNoEncontrada } from "@/dominio/errores/ErrorCategoriaAlimentoNoEncontrada";

/**
 * Las categorías que puede llevar un alimento de una lista (migración 93):
 * en un consultorio, las PREDETERMINADAS de la plataforma más las PROPIAS; en
 * el catálogo de la plataforma, solo las predeterminadas.
 *
 * No es un caso de uso: es lo que comparten los que escriben alimentos (alta,
 * edición, las dos importaciones) para convertir lo que llega —un id elegido
 * en pantalla, un texto de la planilla— en la categoría que se guarda. Que
 * un alimento de la plataforma no pueda llevar una categoría de un
 * consultorio sale de acá: esa lista no la tiene.
 */
export class CategoriasDisponibles {
  constructor(
    /** En orden de prioridad para el texto de una planilla: las propias primero. */
    private readonly listas: ReadonlyArray<ICategoriaAlimentoRepositorio>,
  ) {}

  /** Todas, en el orden de las listas. */
  async todas(): Promise<CategoriaDeAlimento[]> {
    const porLista = await Promise.all(this.listas.map((l) => l.listar()));
    return porLista.flat().map((c) => c.referencia);
  }

  /**
   * La categoría de un id elegido en pantalla. `undefined` es «no tocar» (una
   * edición que no la manda) y `null` o vacío es «sin categoría». Un id que no
   * está en ninguna de las listas es un error: puede ser una categoría que
   * otro borró mientras el formulario estaba abierto, o una de otro
   * consultorio.
   */
  async resolver(
    id: string | null | undefined,
  ): Promise<CategoriaDeAlimento | null | undefined> {
    if (id === undefined) return undefined;
    if (id === null || id.trim() === "") return null;
    for (const lista of this.listas) {
      const categoria = await lista.obtenerPorId(id);
      if (categoria) return categoria.referencia;
    }
    throw new ErrorCategoriaAlimentoNoEncontrada(id);
  }
}

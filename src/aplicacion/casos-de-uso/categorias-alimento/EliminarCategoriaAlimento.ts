import type { ICategoriaAlimentoRepositorio } from "@/dominio/repositorios/ICategoriaAlimentoRepositorio";
import { ErrorCategoriaAlimentoNoEncontrada } from "@/dominio/errores/ErrorCategoriaAlimentoNoEncontrada";

/**
 * Caso de uso: borrar una categoría. No se lleva los alimentos: quedan sin
 * categoría (FK SET NULL), como borrar una carpeta deja sueltos sus planes.
 *
 * Desde un consultorio solo se borran las PROPIAS (ver
 * `RenombrarCategoriaAlimento`): las predeterminadas son de la plataforma.
 */
export class EliminarCategoriaAlimento {
  constructor(private readonly lista: ICategoriaAlimentoRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    if (!(await this.lista.obtenerPorId(id))) {
      throw new ErrorCategoriaAlimentoNoEncontrada(id);
    }
    await this.lista.eliminar(id);
  }
}

import type { CategoriaDeAlimento } from "@/dominio/entidades/CategoriaAlimento";
import type { CategoriasDisponibles } from "./CategoriasDisponibles";

/**
 * Caso de uso: las categorías que ve una lista de alimentos, para los filtros
 * y el selector del formulario. En un consultorio, las predeterminadas (en su
 * orden) y después las propias (por nombre); cada una dice de cuál es.
 */
export class ListarCategoriasAlimento {
  constructor(private readonly disponibles: CategoriasDisponibles) {}

  ejecutar(): Promise<CategoriaDeAlimento[]> {
    return this.disponibles.todas();
  }
}

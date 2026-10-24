import type { ICategoriaAlimentoRepositorio } from "@/dominio/repositorios/ICategoriaAlimentoRepositorio";
import type { CategoriaAlimento } from "@/dominio/entidades/CategoriaAlimento";
import { ErrorCategoriaAlimentoNoEncontrada } from "@/dominio/errores/ErrorCategoriaAlimentoNoEncontrada";
import { verificarNombreLibre } from "./CrearCategoriaAlimento";

/**
 * Caso de uso: renombrar una categoría. Los alimentos la llevan por id, así
 * que el nombre nuevo aparece en todos sin tocarlos.
 *
 * Desde un consultorio solo se renombran las PROPIAS: la lista que recibe es
 * la suya, y una predeterminada no está en ella (sale como no encontrada).
 */
export class RenombrarCategoriaAlimento {
  constructor(
    private readonly lista: ICategoriaAlimentoRepositorio,
    private readonly predeterminadas: ICategoriaAlimentoRepositorio | null = null,
  ) {}

  async ejecutar(id: string, nombre: string): Promise<CategoriaAlimento> {
    const actual = await this.lista.obtenerPorId(id);
    if (!actual) throw new ErrorCategoriaAlimentoNoEncontrada(id);
    const renombrada = actual.renombrar(nombre);
    await verificarNombreLibre(renombrada, this.lista, this.predeterminadas);
    return this.lista.actualizar(renombrada);
  }
}

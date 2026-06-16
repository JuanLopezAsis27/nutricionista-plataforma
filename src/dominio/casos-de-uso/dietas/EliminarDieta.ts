import type { IDietaRepositorio } from "../../repositorios/IDietaRepositorio";
import { ErrorDietaNoEncontrada } from "../../errores/ErrorDietaNoEncontrada";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/**
 * Caso de uso: eliminar una dieta.
 * Verifica que exista y que no tenga asignaciones activas antes de borrar.
 */
export class EliminarDieta {
  constructor(private readonly dietas: IDietaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.dietas.obtenerPorId(id);
    if (!existente) {
      throw new ErrorDietaNoEncontrada(id);
    }

    const asignacionesActivas = await this.dietas.contarAsignacionesActivasDeDieta(id);
    if (asignacionesActivas > 0) {
      throw new ErrorValidacion(
        "No se puede eliminar una dieta con asignaciones activas a pacientes.",
      );
    }

    await this.dietas.eliminar(id);
  }
}

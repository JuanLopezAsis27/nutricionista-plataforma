import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";
import type { DatosRecetaBase } from "./CrearRecetaBase";

/**
 * Caso de uso: editar una receta del catálogo.
 *
 * Las copias que ya hicieron los consultorios NO cambian: son suyas desde que
 * la copiaron, y una receta que el profesional ajustó o compartió con un
 * paciente no puede reescribirse desde afuera.
 */
export class ActualizarRecetaBase {
  constructor(private readonly recetas: IRecetaBaseRepositorio) {}

  async ejecutar(id: string, datos: DatosRecetaBase): Promise<Receta> {
    const receta = await this.recetas.obtenerPorId(id);
    if (!receta) throw new ErrorRecetaNoEncontrada(id);
    return this.recetas.actualizar(receta.actualizar(datos));
  }
}

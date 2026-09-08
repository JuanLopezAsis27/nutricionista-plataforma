import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { Establecimiento } from "@/dominio/entidades/Establecimiento";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import { ErrorEstablecimientoDuplicado } from "@/dominio/errores/ErrorEstablecimientoDuplicado";

/**
 * Caso de uso: volver a poner en uso una sede archivada.
 *
 * Comprueba el nombre porque la unicidad es solo entre vigentes: mientras
 * estuvo archivada pudo crearse otra con el mismo nombre, y restaurarla sin
 * mirar chocaría contra el índice de la base con un error de Postgres en vez
 * de uno explicado.
 */
export class RestaurarEstablecimiento {
  constructor(private readonly repo: IEstablecimientoRepositorio) {}

  async ejecutar(id: string): Promise<Establecimiento> {
    const establecimiento = await this.repo.obtenerPorId(id);
    if (!establecimiento) {
      throw new ErrorEstablecimientoNoEncontrado(id);
    }
    if (!establecimiento.estaArchivado) {
      return establecimiento;
    }
    if (await this.repo.existeNombre(establecimiento.nombre, id)) {
      throw new ErrorEstablecimientoDuplicado(establecimiento.nombre);
    }
    return this.repo.actualizar(establecimiento.restaurar());
  }
}

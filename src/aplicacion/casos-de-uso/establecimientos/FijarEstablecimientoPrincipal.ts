import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { Establecimiento } from "@/dominio/entidades/Establecimiento";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: elegir la sede principal, la que rige cuando no se eligió otra.
 *
 * El desmarcado de la anterior y el marcado de la nueva van juntos en el
 * repositorio: hay un índice único parcial que no admite dos principales ni por
 * un instante.
 */
export class FijarEstablecimientoPrincipal {
  constructor(private readonly repo: IEstablecimientoRepositorio) {}

  async ejecutar(id: string): Promise<Establecimiento> {
    const establecimiento = await this.repo.obtenerPorId(id);
    if (!establecimiento) {
      throw new ErrorEstablecimientoNoEncontrado(id);
    }
    if (establecimiento.estaArchivado) {
      throw new ErrorValidacion(
        `«${establecimiento.nombre}» está archivado: no puede ser el establecimiento principal.`,
      );
    }

    await this.repo.fijarPrincipal(id);
    return establecimiento.marcarPrincipal(true);
  }
}

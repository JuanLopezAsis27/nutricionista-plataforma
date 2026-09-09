import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type {
  Establecimiento,
  DatosEstablecimiento,
} from "@/dominio/entidades/Establecimiento";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import { ErrorEstablecimientoDuplicado } from "@/dominio/errores/ErrorEstablecimientoDuplicado";

/**
 * Caso de uso: editar una sede, incluida su agenda (días, horario, duración y
 * paso del turno). Es lo que reemplazó a "Configuración → Turnos".
 */
export class ActualizarEstablecimiento {
  constructor(private readonly repo: IEstablecimientoRepositorio) {}

  async ejecutar(
    id: string,
    cambios: Partial<DatosEstablecimiento>,
  ): Promise<Establecimiento> {
    const establecimiento = await this.repo.obtenerPorId(id);
    if (!establecimiento) {
      throw new ErrorEstablecimientoNoEncontrado(id);
    }

    // El nombre se compara excluyendo la propia fila: guardar sin tocarlo no
    // puede chocar consigo mismo.
    if (cambios.nombre !== undefined) {
      const nombre = cambios.nombre.trim();
      if (await this.repo.existeNombre(nombre, id)) {
        throw new ErrorEstablecimientoDuplicado(nombre);
      }
    }

    return this.repo.actualizar(establecimiento.actualizar(cambios));
  }
}

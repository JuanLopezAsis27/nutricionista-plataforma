import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import {
  Establecimiento,
  type DatosEstablecimiento,
} from "@/dominio/entidades/Establecimiento";
import { ErrorEstablecimientoDuplicado } from "@/dominio/errores/ErrorEstablecimientoDuplicado";

/**
 * Caso de uso: dar de alta una sede.
 *
 * Si es la primera del consultorio queda como principal: sin ninguna marcada,
 * un turno que no elige sede no tendría dónde caer.
 */
export class CrearEstablecimiento {
  constructor(private readonly repo: IEstablecimientoRepositorio) {}

  async ejecutar(
    datos: Partial<DatosEstablecimiento> & { nombre: string },
  ): Promise<Establecimiento> {
    const nombre = datos.nombre.trim();
    if (await this.repo.existeNombre(nombre)) {
      throw new ErrorEstablecimientoDuplicado(nombre);
    }

    const vigentes = await this.repo.listar();
    const creado = await this.repo.crear(
      Establecimiento.crear({ ...datos, nombre }),
    );

    if (vigentes.length === 0) {
      await this.repo.fijarPrincipal(creado.id);
      return creado.marcarPrincipal(true);
    }
    return creado;
  }
}

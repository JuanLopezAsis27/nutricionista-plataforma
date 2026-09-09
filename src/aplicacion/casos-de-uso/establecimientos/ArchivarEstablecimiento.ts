import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { Establecimiento } from "@/dominio/entidades/Establecimiento";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: dar de baja una sede.
 *
 * Es baja LÓGICA, siempre: los turnos de los últimos años ocurrieron ahí y la
 * FK es RESTRICT. Y no se puede archivar la última vigente: un consultorio sin
 * ninguna sede activa no puede agendar nada, y el profesional descubriría el
 * bloqueo recién al intentar dar el próximo turno.
 *
 * Si la archivada era la principal, el rol pasa a otra vigente en vez de quedar
 * vacante: agendar caería igual en la primera, pero dejarlo explícito evita que
 * el default dependa del orden de una consulta.
 */
export class ArchivarEstablecimiento {
  constructor(private readonly repo: IEstablecimientoRepositorio) {}

  async ejecutar(id: string): Promise<Establecimiento> {
    const establecimiento = await this.repo.obtenerPorId(id);
    if (!establecimiento) {
      throw new ErrorEstablecimientoNoEncontrado(id);
    }
    if (establecimiento.estaArchivado) {
      return establecimiento;
    }

    const vigentes = await this.repo.listar();
    if (vigentes.length <= 1) {
      throw new ErrorValidacion(
        "No se puede archivar el único establecimiento activo: sin ninguno no se pueden agendar turnos.",
      );
    }

    const archivado = await this.repo.actualizar(establecimiento.archivar());

    if (establecimiento.esPrincipal) {
      const reemplazo = vigentes.find((otro) => otro.id !== id);
      if (reemplazo) await this.repo.fijarPrincipal(reemplazo.id);
    }
    return archivado;
  }
}

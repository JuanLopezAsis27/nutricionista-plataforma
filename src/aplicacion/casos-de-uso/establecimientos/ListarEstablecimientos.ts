import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { Establecimiento } from "@/dominio/entidades/Establecimiento";

/**
 * Caso de uso: listar los establecimientos del consultorio.
 *
 * Por defecto solo los vigentes: los archivados existen para que el histórico
 * de turnos siga teniendo dónde apoyarse, no para elegirlos al agendar. La
 * pantalla de gestión es la única que los pide.
 */
export class ListarEstablecimientos {
  constructor(private readonly repo: IEstablecimientoRepositorio) {}

  async ejecutar(
    opciones: { incluirArchivados?: boolean } = {},
  ): Promise<Establecimiento[]> {
    return this.repo.listar(opciones);
  }
}

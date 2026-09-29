import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";

export interface PacienteAsignado {
  id: string;
  nombre: string;
}

/**
 * Caso de uso: pacientes con los que se compartió una receta, con su nombre.
 *
 * El nombre se resuelve acá, por id, y no en la pantalla contra un listado
 * paginado: compartir con todos deja la lista más larga que cualquier página,
 * y los que quedaban afuera se veían como un id. Incluye a los archivados, que
 * lo siguen teniendo asignado.
 */
export class ObtenerPacientesDeReceta {
  constructor(
    private readonly repositorio: IRecetaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(recetaId: string): Promise<PacienteAsignado[]> {
    const ids = await this.repositorio.listarPacientesAsignados(recetaId);
    const fichas = await this.pacientes.obtenerPorIds(ids);
    return fichas
      .map((p) => ({ id: p.id, nombre: p.nombreCompleto }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
}

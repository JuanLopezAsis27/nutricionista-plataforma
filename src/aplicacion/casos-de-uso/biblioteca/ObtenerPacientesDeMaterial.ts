import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";

export interface PacienteAsignado {
  id: string;
  nombre: string;
}

/**
 * Caso de uso: pacientes con los que se compartió un material, con su nombre.
 *
 * El nombre se resuelve acá, por id, y no en la pantalla contra un listado
 * paginado: compartir con todos deja la lista más larga que cualquier página,
 * y los que quedaban afuera se veían como un id. Incluye a los archivados, que
 * lo siguen teniendo asignado.
 */
export class ObtenerPacientesDeMaterial {
  constructor(
    private readonly repositorio: IMaterialRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(materialId: string): Promise<PacienteAsignado[]> {
    const ids = await this.repositorio.listarPacientesAsignados(materialId);
    const fichas = await this.pacientes.obtenerPorIds(ids);
    return fichas
      .map((p) => ({ id: p.id, nombre: p.nombreCompleto }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
}

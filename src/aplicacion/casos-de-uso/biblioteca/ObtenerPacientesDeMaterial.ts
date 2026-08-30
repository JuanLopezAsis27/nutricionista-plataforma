import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";

/** Caso de uso: ids de los pacientes con los que se compartió un material. */
export class ObtenerPacientesDeMaterial {
  constructor(private readonly materiales: IMaterialRepositorio) {}

  async ejecutar(materialId: string): Promise<string[]> {
    return this.materiales.listarPacientesAsignados(materialId);
  }
}

import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorMaterialNoEncontrado } from "@/dominio/errores/ErrorMaterialNoEncontrado";

/**
 * Caso de uso: compartir el material con TODOS los pacientes vigentes del
 * consultorio de una vez. Los archivados quedan afuera (archivar es una baja
 * lógica) y los que ya lo tenían no se duplican.
 *
 * Se resuelve en el servidor y no tildando uno por uno en la pantalla: el
 * selector de pacientes es paginado, y "todos" desde ahí serían solo los de la
 * primera página.
 */
export class CompartirMaterialConTodos {
  constructor(
    private readonly repositorio: IMaterialRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    materialId: string,
  ): Promise<{ nuevos: number; pacientes: number }> {
    const existente = await this.repositorio.obtenerPorId(materialId);
    if (!existente) {
      throw new ErrorMaterialNoEncontrado(materialId);
    }
    const vigentes = await this.pacientes.listar();
    const nuevos = await this.repositorio.asignarAPacientes(
      materialId,
      vigentes.map((p) => p.id),
    );
    return { nuevos, pacientes: vigentes.length };
  }
}

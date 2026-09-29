import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";

/**
 * Caso de uso: compartir la receta con TODOS los pacientes vigentes del
 * consultorio de una vez. Los archivados quedan afuera (archivar es una baja
 * lógica) y los que ya la tenían no se duplican.
 *
 * Se resuelve en el servidor y no tildando uno por uno en la pantalla: el
 * selector de pacientes es paginado, y "todos" desde ahí serían solo los de la
 * primera página.
 */
export class CompartirRecetaConTodos {
  constructor(
    private readonly repositorio: IRecetaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    recetaId: string,
  ): Promise<{ nuevos: number; pacientes: number }> {
    const existente = await this.repositorio.obtenerPorId(recetaId);
    if (!existente) {
      throw new ErrorRecetaNoEncontrada(recetaId);
    }
    const vigentes = await this.pacientes.listar();
    const nuevos = await this.repositorio.asignarAPacientes(
      recetaId,
      vigentes.map((p) => p.id),
    );
    return { nuevos, pacientes: vigentes.length };
  }
}

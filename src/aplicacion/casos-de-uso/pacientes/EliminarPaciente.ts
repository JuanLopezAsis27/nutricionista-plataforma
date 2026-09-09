import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: eliminar un paciente y su cuenta de acceso.
 * Verifica que exista antes de borrar (lanza ErrorPacienteNoEncontrado).
 */
export class EliminarPaciente {
  constructor(
    private readonly repositorio: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.repositorio.obtenerPorId(id);
    if (!existente) {
      throw new ErrorPacienteNoEncontrado(id);
    }
    // Primero la cuenta de acceso, luego la ficha.
    await this.usuarios.eliminarPorPacienteId(id);
    await this.repositorio.eliminar(id);
  }
}

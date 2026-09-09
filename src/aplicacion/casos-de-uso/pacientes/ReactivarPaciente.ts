import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Paciente } from "@/dominio/entidades/Paciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Caso de uso: volver a poner en seguimiento a un paciente archivado. */
export class ReactivarPaciente {
  constructor(private readonly repositorio: IPacienteRepositorio) {}

  async ejecutar(id: string): Promise<Paciente> {
    const paciente = await this.repositorio.obtenerPorId(id);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(id);
    }
    return this.repositorio.actualizar(paciente.reactivar());
  }
}

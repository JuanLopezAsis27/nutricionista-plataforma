import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Paciente } from "@/dominio/entidades/Paciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: obtener un paciente por su id.
 * Lanza ErrorPacienteNoEncontrado si no existe.
 */
export class ObtenerPacientePorId {
  constructor(private readonly repositorio: IPacienteRepositorio) {}

  async ejecutar(id: string): Promise<Paciente> {
    const paciente = await this.repositorio.obtenerPorId(id);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(id);
    }
    return paciente;
  }
}

import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Turno } from "@/dominio/entidades/Turno";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: obtener los turnos de un paciente.
 * Verifica que el paciente exista y devuelve sus turnos ordenados por fecha
 * descendente (orden garantizado por el repositorio).
 */
export class ObtenerTurnosPorPaciente {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<Turno[]> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.turnos.obtenerPorPaciente(pacienteId);
  }
}

import type { IDietaRepositorio } from "../../repositorios/IDietaRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { Dieta } from "../../entidades/Dieta";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: obtener la dieta activa de un paciente (con sus comidas).
 * Verifica que el paciente exista. Devuelve null si no tiene dieta asignada.
 */
export class ObtenerDietaDelPaciente {
  constructor(
    private readonly dietas: IDietaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<Dieta | null> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.dietas.obtenerDietaActivaDePaciente(pacienteId);
  }
}

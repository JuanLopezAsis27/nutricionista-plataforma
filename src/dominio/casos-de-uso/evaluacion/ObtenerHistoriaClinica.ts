import type { IHistoriaClinicaRepositorio } from "../../repositorios/IHistoriaClinicaRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { HistoriaClinica } from "../../entidades/HistoriaClinica";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: obtener la historia clínica del paciente.
 * Devuelve null si todavía no se cargó (no es un error).
 */
export class ObtenerHistoriaClinica {
  constructor(
    private readonly historias: IHistoriaClinicaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<HistoriaClinica | null> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.historias.obtenerPorPaciente(pacienteId);
  }
}

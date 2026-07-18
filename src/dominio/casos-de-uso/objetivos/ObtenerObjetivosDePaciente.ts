import type { IObjetivoRepositorio } from "../../repositorios/IObjetivoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { Objetivo } from "../../entidades/Objetivo";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Caso de uso: objetivos de un paciente (con sus estrategias). */
export class ObtenerObjetivosDePaciente {
  constructor(
    private readonly objetivos: IObjetivoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<Objetivo[]> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.objetivos.listarPorPaciente(pacienteId);
  }
}

import type { IAlertaAlimentariaRepositorio } from "../../repositorios/IAlertaAlimentariaRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { AlertaAlimentaria } from "../../entidades/AlertaAlimentaria";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Caso de uso: listar las alertas alimentarias del paciente. */
export class ObtenerAlertasAlimentarias {
  constructor(
    private readonly alertas: IAlertaAlimentariaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<AlertaAlimentaria[]> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.alertas.listarPorPaciente(pacienteId);
  }
}

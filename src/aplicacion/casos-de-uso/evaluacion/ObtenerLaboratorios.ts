import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Laboratorio } from "@/dominio/entidades/Laboratorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Caso de uso: listar los laboratorios del paciente (con adjuntos). */
export class ObtenerLaboratorios {
  constructor(
    private readonly laboratorios: ILaboratorioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<Laboratorio[]> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.laboratorios.listarPorPaciente(pacienteId);
  }
}

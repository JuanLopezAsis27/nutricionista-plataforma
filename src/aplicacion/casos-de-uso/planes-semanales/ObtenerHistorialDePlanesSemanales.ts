import type {
  IAsignacionPlanSemanalRepositorio,
  AsignacionPlanSemanal,
} from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: todos los planes semanales que siguió un paciente, del más
 * reciente al más viejo. Incluye el vigente: es la línea de tiempo completa.
 */
export class ObtenerHistorialDePlanesSemanales {
  constructor(
    private readonly asignaciones: IAsignacionPlanSemanalRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<AsignacionPlanSemanal[]> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.asignaciones.listarAsignacionesDePaciente(pacienteId);
  }
}

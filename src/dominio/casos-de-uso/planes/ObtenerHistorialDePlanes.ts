import type {
  IPlanRepositorio,
  AsignacionPlan,
} from "../../repositorios/IPlanRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: todos los planes que siguió un paciente, del más reciente al
 * más viejo, con sus fechas.
 *
 * Incluye el activo: el historial es la línea de tiempo completa, y sacarle el
 * tramo de hoy obligaría a la pantalla a pegarlo de otra consulta.
 *
 * Las entradas cuyo plan se borró siguen apareciendo, con el nombre que tenían
 * al asignarse (`nombrePlan`). Eso es lo que hace que sea un historial y no una
 * vista del estado actual.
 */
export class ObtenerHistorialDePlanes {
  constructor(
    private readonly planes: IPlanRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<AsignacionPlan[]> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.planes.listarAsignacionesDePaciente(pacienteId);
  }
}

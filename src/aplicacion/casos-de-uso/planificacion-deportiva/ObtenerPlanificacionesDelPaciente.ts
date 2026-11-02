import type {
  IAsignacionPlanificacionRepositorio,
  AsignacionConPlanificacion,
} from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";

/**
 * Caso de uso: las planificaciones asignadas a un paciente, cada una con la
 * competencia para la que es. La usan la ficha del paciente y su portal
 * (con el paciente de la sesión). En el portal esta lista ES la autorización:
 * el detalle de una planificación sale de ella, y una que no le asignaron no
 * está.
 */
export class ObtenerPlanificacionesDelPaciente {
  constructor(
    private readonly asignaciones: IAsignacionPlanificacionRepositorio,
  ) {}

  ejecutar(pacienteId: string): Promise<AsignacionConPlanificacion[]> {
    return this.asignaciones.listarDePaciente(pacienteId);
  }

  /** Cuántas tiene, sin traerlas (el menú del portal). */
  contar(pacienteId: string): Promise<number> {
    return this.asignaciones.contarDePaciente(pacienteId);
  }
}

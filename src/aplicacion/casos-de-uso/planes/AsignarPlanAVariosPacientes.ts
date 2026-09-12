import type { AsignacionPlan } from "@/dominio/repositorios/IPlanRepositorio";
import { AsignarPlanAPaciente } from "./AsignarPlanAPaciente";

/** Entrada: un plan, varios pacientes, el mismo período para todos. */
export interface DatosAsignarPlanAVarios {
  planId: string;
  pacienteIds: string[];
  fechaInicio: Date;
  fechaFin?: Date | null;
}

/** Una asignación lograda, o el motivo por el que ese paciente no lo recibió. */
export interface ResultadoAsignacionMultiple {
  pacienteId: string;
  asignacion: AsignacionPlan | null;
  error: string | null;
}

/**
 * Caso de uso: asignar el MISMO plan a varios pacientes a la vez, desde la
 * pantalla general de planes ("Asignar a paciente" ya no elige uno solo).
 *
 * Reusa `AsignarPlanAPaciente` paciente por paciente, en vez de una versión
 * propia de la regla: son la misma asignación repetida, no una nueva. Cada
 * paciente es independiente —el que ya tenía plan activo lo pierde igual que
 * si se lo asignaran de a uno—, así que un paciente que falla (no existe, el
 * plan es una plantilla) no aborta a los demás: se junta el error y se sigue,
 * porque a mitad de una tanda de diez nadie quiere perder las nueve que sí
 * iban a andar.
 */
export class AsignarPlanAVariosPacientes {
  constructor(private readonly asignarUC: AsignarPlanAPaciente) {}

  async ejecutar(
    datos: DatosAsignarPlanAVarios,
  ): Promise<ResultadoAsignacionMultiple[]> {
    const resultados: ResultadoAsignacionMultiple[] = [];
    for (const pacienteId of new Set(datos.pacienteIds)) {
      try {
        const asignacion = await this.asignarUC.ejecutar({
          planId: datos.planId,
          pacienteId,
          fechaInicio: datos.fechaInicio,
          fechaFin: datos.fechaFin ?? null,
        });
        resultados.push({ pacienteId, asignacion, error: null });
      } catch (error) {
        resultados.push({
          pacienteId,
          asignacion: null,
          error: error instanceof Error ? error.message : "Error desconocido.",
        });
      }
    }
    return resultados;
  }
}

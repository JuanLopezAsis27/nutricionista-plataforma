import type { PlanSemanal } from "../entidades/PlanSemanal";

/**
 * Vinculación de un plan semanal a un paciente durante un período.
 *
 * Es el mismo contrato que `AsignacionPlan` y por las mismas razones: son el
 * HISTORIAL del paciente —no se borran, se desactivan— y sobreviven al borrado
 * del plan (`planSemanalId` nullable + `nombrePlan` congelado). Qué menú siguió
 * y entre qué fechas es información del paciente, no del plan.
 *
 * Son DOS historiales separados, el del plan y el del plan semanal, porque son
 * dos cosas que se cambian por separado: se puede reemplazar el menú de la
 * semana sin tocar la pauta de macros, y al revés.
 */
export interface AsignacionPlanSemanal {
  id: string;
  /** Null si el plan semanal se borró. La asignación queda igual. */
  planSemanalId: string | null;
  /** Nombre al asignarlo. Es una foto: sobrevive al borrado y al renombre. */
  nombrePlan: string;
  pacienteId: string;
  fechaInicio: Date;
  /** Fin PLANIFICADO al asignar. No es cuándo terminó de verdad. */
  fechaFin: Date | null;
  /** Cuándo dejó de regir realmente (al reemplazarla o finalizarla). */
  finalizadaEn: Date | null;
  activa: boolean;
}

/** Asignación con el nombre del paciente, para la lista de un plan semanal. */
export interface AsignacionSemanalConPaciente extends AsignacionPlanSemanal {
  pacienteNombre: string;
  pacienteApellido: string;
}

/** Contrato de las asignaciones plan semanal ⇄ paciente (puerto de salida). */
export interface IAsignacionPlanSemanalRepositorio {
  asignarAPaciente(
    asignacion: AsignacionPlanSemanal,
  ): Promise<AsignacionPlanSemanal>;
  /**
   * Cierra las asignaciones activas del paciente dejando registrado CUÁNDO
   * dejaron de regir. La fecha la decide el caso de uso: al reemplazar es el
   * inicio del nuevo, al finalizar a mano es hoy.
   */
  desactivarAsignacionesDe(
    pacienteId: string,
    finalizadaEn: Date,
  ): Promise<void>;
  obtenerAsignacionActiva(
    pacienteId: string,
  ): Promise<AsignacionPlanSemanal | null>;
  /** Historial completo del paciente, del más reciente al más viejo. */
  listarAsignacionesDePaciente(
    pacienteId: string,
  ): Promise<AsignacionPlanSemanal[]>;
  /** Pacientes que tienen o tuvieron este plan semanal. */
  listarAsignacionesDePlan(
    planSemanalId: string,
  ): Promise<AsignacionSemanalConPaciente[]>;
  /**
   * El plan semanal que el paciente sigue hoy, ya resuelto. Devuelve el PLAN y
   * no la asignación porque quien pregunta esto quiere el menú, no el vínculo.
   */
  obtenerPlanSemanalActivoDePaciente(
    pacienteId: string,
  ): Promise<PlanSemanal | null>;
  /** Cantidad de asignaciones activas que apuntan a un plan semanal. */
  contarAsignacionesActivasDePlan(planSemanalId: string): Promise<number>;
}

import type { PlanificacionDeportiva } from "../entidades/PlanificacionDeportiva";

/**
 * Una planificación deportiva asignada a un paciente (migración 94): es lo
 * que el paciente ve en su portal. Vínculo puro, como `AsignacionPlan`:
 * desasignar borra la fila. Puede estar atada a UNA competencia del
 * calendario del paciente («para la Maratón de Buenos Aires»).
 */
export interface AsignacionPlanificacion {
  id: string;
  planificacionId: string;
  pacienteId: string;
  competenciaId: string | null;
  creadoEn: Date;
}

/** La competencia a la que apunta una asignación, con lo que se muestra. */
export interface CompetenciaDeAsignacion {
  id: string;
  nombre: string;
  fecha: Date;
  lugar: string | null;
}

/** Una asignación con su planificación entera: lo que lee la ficha y el portal. */
export interface AsignacionConPlanificacion extends AsignacionPlanificacion {
  planificacion: PlanificacionDeportiva;
  competencia: CompetenciaDeAsignacion | null;
}

/** Una asignación con el nombre del paciente: quién tiene una planificación. */
export interface AsignacionConPaciente extends AsignacionPlanificacion {
  pacienteNombre: string;
  pacienteApellido: string;
  competencia: CompetenciaDeAsignacion | null;
}

/** Contrato de persistencia de las asignaciones de planificaciones deportivas. */
export interface IAsignacionPlanificacionRepositorio {
  /**
   * Asigna, o actualiza la competencia si el paciente ya la tenía: una
   * planificación se asigna una sola vez a cada paciente (único en la base).
   */
  asignar(
    asignacion: AsignacionPlanificacion,
  ): Promise<AsignacionPlanificacion>;
  desasignar(planificacionId: string, pacienteId: string): Promise<void>;
  obtenerAsignacion(
    planificacionId: string,
    pacienteId: string,
  ): Promise<AsignacionPlanificacion | null>;
  /** Las del paciente, de la competencia más próxima a la más lejana; las sin competencia al final. */
  listarDePaciente(pacienteId: string): Promise<AsignacionConPlanificacion[]>;
  /** Cuántas tiene: el menú del portal lo pregunta en cada pantalla, sin traerlas. */
  contarDePaciente(pacienteId: string): Promise<number>;
  listarDePlanificacion(
    planificacionId: string,
  ): Promise<AsignacionConPaciente[]>;
  /** Cuántos pacientes tiene cada una, para el listado (las que no tienen, no aparecen). */
  contarPacientes(planificacionIds: string[]): Promise<Map<string, number>>;
}

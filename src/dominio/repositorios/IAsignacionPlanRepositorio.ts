import type { PlanNutricional } from "../entidades/PlanNutricional";

/**
 * Vinculación de un plan a un paciente durante un período.
 * Se modela como tipo de dominio (no entidad rica) por simplicidad.
 *
 * Las asignaciones son el HISTORIAL del paciente: no se borran, se desactivan,
 * y sobreviven al borrado del plan. Qué siguió y entre qué fechas es
 * información del paciente, no un detalle del plan.
 */
export interface AsignacionPlan {
  id: string;
  /** Null si el plan se borró. La asignación queda igual. */
  planId: string | null;
  /** Nombre del plan al asignarlo. Es una foto: sobrevive al borrado y al renombre. */
  nombrePlan: string;
  pacienteId: string;
  fechaInicio: Date;
  /** Fin PLANIFICADO al asignar. No es cuándo terminó de verdad. */
  fechaFin: Date | null;
  /** Cuándo dejó de regir realmente (al reemplazarla o finalizarla). */
  finalizadaEn: Date | null;
  activa: boolean;
}

/** Asignación con el nombre del paciente, para la lista de un plan. */
export interface AsignacionConPaciente extends AsignacionPlan {
  pacienteNombre: string;
  pacienteApellido: string;
}

/**
 * Contrato de las asignaciones plan⇄paciente (puerto de salida).
 *
 * ## Por qué es un puerto aparte de `IPlanRepositorio`
 *
 * Son dos agregados con ciclos de vida distintos. Un plan es una plantilla que
 * el consultorio edita y archiva; una asignación es un tramo del historial de
 * UN paciente, que no se borra ni se edita —se desactiva— y que **sobrevive al
 * borrado del plan** (por eso `planId` es nullable y `nombrePlan` guarda una
 * foto del nombre).
 *
 * La separación tiene un motivo medido, no estético: de los 19 consumidores
 * del puerto original, **15 necesitaban uno solo de los dos grupos**. Cuatro de
 * ellos ni siquiera son del módulo de planes —viven en archivos, IA,
 * seguimiento y tracking— y dependían de los 17 métodos para usar uno.
 *
 * `PrismaRepositorioPlan` implementa los dos puertos: una tabla puede servir a
 * dos contratos, y el cableado inyecta la misma instancia donde hace falta.
 */
export interface IAsignacionPlanRepositorio {
  asignarAPaciente(asignacion: AsignacionPlan): Promise<AsignacionPlan>;
  /**
   * Cierra las asignaciones activas del paciente dejando registrado CUÁNDO
   * dejaron de regir. La fecha la decide el caso de uso: al reemplazar un plan
   * es el inicio del nuevo, al finalizarlo a mano es hoy.
   */
  desactivarAsignacionesDe(
    pacienteId: string,
    finalizadaEn: Date,
  ): Promise<void>;
  obtenerAsignacionActiva(pacienteId: string): Promise<AsignacionPlan | null>;
  /** Pacientes que tienen o tuvieron este plan, del más reciente al más viejo. */
  listarAsignacionesDePlan(planId: string): Promise<AsignacionConPaciente[]>;
  /** Historial completo de planes del paciente, del más reciente al más viejo. */
  listarAsignacionesDePaciente(pacienteId: string): Promise<AsignacionPlan[]>;
  /**
   * El plan que el paciente sigue hoy, ya resuelto.
   *
   * Devuelve el PLAN y no la asignación porque quien pregunta esto —el portal,
   * la IA, el tracking— quiere el contenido, no el vínculo.
   */
  obtenerPlanActivoDePaciente(
    pacienteId: string,
  ): Promise<PlanNutricional | null>;
  /** Asignaciones aún activas cuya fecha de fin ya pasó (para alertas). */
  listarAsignacionesActivasVencidas(
    fechaLimite: Date,
  ): Promise<AsignacionPlan[]>;
  /** Cantidad de asignaciones activas que apuntan a un plan. */
  contarAsignacionesActivasDePlan(planId: string): Promise<number>;
}

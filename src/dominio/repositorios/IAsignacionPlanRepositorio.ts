import type { PlanNutricional } from "../entidades/PlanNutricional";

/**
 * Vinculación de un plan a un paciente.
 * Se modela como tipo de dominio (no entidad rica) por simplicidad.
 *
 * Es un vínculo PURO —plan y paciente, nada más—, como el de una receta o un
 * material compartido. Un paciente puede tener VARIOS planes asignados al
 * mismo tiempo: no hay período, no hay uno vigente que le gane a los otros y
 * no queda registro de los que tuvo antes (migración 69).
 */
export interface AsignacionPlan {
  id: string;
  planId: string;
  pacienteId: string;
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
 * Son dos agregados con ciclos de vida distintos. Un plan es contenido que el
 * consultorio edita, archiva y reusa; una asignación solo dice que ese plan
 * está compartido con ese paciente, y se crea y se borra sin tocarlo.
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
  /**
   * Asigna el plan al paciente. Es IDEMPOTENTE: asignar dos veces el mismo
   * plan al mismo paciente deja una sola asignación, como en recetas y
   * materiales. La garantía dura es el índice único (planId, pacienteId).
   */
  asignarAPaciente(asignacion: AsignacionPlan): Promise<AsignacionPlan>;
  /**
   * Saca UN plan de UN paciente. Los demás planes que tenga siguen ahí.
   *
   * Borra el vínculo y, **en la misma transacción**, deja el registro de que lo
   * tuvo: qué plan (con el nombre congelado), desde cuándo y hasta cuándo. Las
   * dos cosas van juntas porque son la misma decisión: si el borrado anduviera
   * sin el registro, el paciente perdería el plan y nadie podría decir que
   * alguna vez lo tuvo.
   *
   * Ese registro no se lee desde ninguna pantalla —el front solo muestra lo
   * asignado hoy— y por eso no hay método para leerlo: es información clínica
   * que se guarda porque no se puede reconstruir después, no un read model.
   *
   * Desasignar un plan que el paciente no tiene no hace nada y no falla.
   */
  desasignarDePaciente(
    planId: string,
    pacienteId: string,
    desasignadoEn: Date,
  ): Promise<void>;
  /** ¿Este paciente tiene este plan asignado hoy? */
  estaAsignado(planId: string, pacienteId: string): Promise<boolean>;
  /** Pacientes que tienen este plan asignado. */
  listarAsignacionesDePlan(planId: string): Promise<AsignacionConPaciente[]>;
  /**
   * Los planes que el paciente tiene asignados, ya resueltos.
   *
   * Devuelve los PLANES y no las asignaciones porque quien pregunta esto —el
   * portal, la IA, el tracking— quiere el contenido, no el vínculo.
   */
  listarPlanesDePaciente(pacienteId: string): Promise<PlanNutricional[]>;
  /** Cantidad de pacientes que tienen asignado un plan. */
  contarAsignacionesDePlan(planId: string): Promise<number>;
}

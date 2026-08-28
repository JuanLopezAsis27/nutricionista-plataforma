import type { ObjetivoComposicion } from "../entidades/ObjetivoComposicion";
import type { VariableComposicion } from "../entidades/ObjetivoComposicion";

/** Contrato de persistencia para los objetivos de composición corporal. */
export interface IObjetivoComposicionRepositorio {
  /**
   * Crea la meta o reemplaza la que ya exista para ese paciente y variable
   * (hay una sola vigente por variable). Devuelve la versión persistida.
   */
  guardar(objetivo: ObjetivoComposicion): Promise<ObjetivoComposicion>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<ObjetivoComposicion | null>;
  /** Meta vigente del paciente para esa variable, si existe. */
  obtenerPorVariable(
    pacienteId: string,
    variable: VariableComposicion,
  ): Promise<ObjetivoComposicion | null>;
  /** Todas las metas del paciente, ordenadas por fecha de creación. */
  listarPorPaciente(pacienteId: string): Promise<ObjetivoComposicion[]>;
}

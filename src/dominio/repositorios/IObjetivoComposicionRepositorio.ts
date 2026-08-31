import type { ObjetivoComposicion } from "../entidades/ObjetivoComposicion";
import type { VariableComposicion } from "../entidades/ObjetivoComposicion";
import type { MetodoGrasa } from "../servicios/grasaPorPliegues";

/** Contrato de persistencia para los objetivos de composición corporal. */
export interface IObjetivoComposicionRepositorio {
  /**
   * Crea la meta o reemplaza la que ya exista para esa combinación de
   * paciente, variable y ecuación. Devuelve la versión persistida.
   */
  guardar(objetivo: ObjetivoComposicion): Promise<ObjetivoComposicion>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<ObjetivoComposicion | null>;
  /**
   * Meta vigente del paciente para esa variable Y esa ecuación, si existe.
   *
   * La ecuación es parte de la clave y no un filtro opcional: el % graso por
   * Yuhasz y el % graso por Durnin & Womersley son dos metas distintas sobre
   * dos formas de medir distintas. `null` identifica a las variables que no
   * dependen de ninguna ecuación (peso, IMC, las masas de Kerr).
   */
  obtenerPorVariable(
    pacienteId: string,
    variable: VariableComposicion,
    metodoGrasa: MetodoGrasa | null,
  ): Promise<ObjetivoComposicion | null>;
  /** Todas las metas del paciente, ordenadas por fecha de creación. */
  listarPorPaciente(pacienteId: string): Promise<ObjetivoComposicion[]>;
}

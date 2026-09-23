import type {
  ObjetivoBioimpedancia,
  VariableBioimpedancia,
} from "../entidades/ObjetivoBioimpedancia";

/** Contrato de persistencia para las metas de bioimpedancia. */
export interface IObjetivoBioimpedanciaRepositorio {
  /** Crea la meta o la reemplaza si ya existe ese id. */
  guardar(objetivo: ObjetivoBioimpedancia): Promise<ObjetivoBioimpedancia>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<ObjetivoBioimpedancia | null>;
  /** Meta vigente del paciente para esa variable, si existe. */
  obtenerPorVariable(
    pacienteId: string,
    variable: VariableBioimpedancia,
  ): Promise<ObjetivoBioimpedancia | null>;
  /** Todas las metas del paciente, ordenadas por fecha de creación. */
  listarPorPaciente(pacienteId: string): Promise<ObjetivoBioimpedancia[]>;
}

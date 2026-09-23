import type { Bioimpedancia } from "../entidades/Bioimpedancia";

/** Contrato de persistencia para las mediciones de bioimpedancia. */
export interface IBioimpedanciaRepositorio {
  crear(medicion: Bioimpedancia): Promise<Bioimpedancia>;
  actualizar(medicion: Bioimpedancia): Promise<Bioimpedancia>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Bioimpedancia | null>;
  /** Mediciones del paciente ordenadas por fecha ascendente. */
  listarPorPaciente(pacienteId: string): Promise<Bioimpedancia[]>;
  /** ¿Existe otra medición del paciente en esa fecha? (excluirId para ediciones). */
  existeEnFecha(
    pacienteId: string,
    fecha: Date,
    excluirId?: string,
  ): Promise<boolean>;
}

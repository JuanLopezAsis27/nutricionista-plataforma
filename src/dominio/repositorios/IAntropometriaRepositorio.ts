import type { Antropometria } from "../entidades/Antropometria";

/** Contrato de persistencia para las mediciones antropométricas. */
export interface IAntropometriaRepositorio {
  crear(medicion: Antropometria): Promise<Antropometria>;
  actualizar(medicion: Antropometria): Promise<Antropometria>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Antropometria | null>;
  /** Mediciones del paciente ordenadas por fecha ascendente. */
  listarPorPaciente(pacienteId: string): Promise<Antropometria[]>;
  /** ¿Existe otra medición del paciente en esa fecha? (excluirId para ediciones). */
  existeEnFecha(
    pacienteId: string,
    fecha: Date,
    excluirId?: string,
  ): Promise<boolean>;
}

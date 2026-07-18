import type { Suplemento } from "../entidades/Suplemento";

/** Contrato de persistencia de los suplementos indicados a pacientes. */
export interface ISuplementoRepositorio {
  crear(suplemento: Suplemento): Promise<Suplemento>;
  actualizar(suplemento: Suplemento): Promise<Suplemento>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Suplemento | null>;
  /** Suplementos del paciente (activos primero, más recientes primero). */
  listarPorPaciente(pacienteId: string, incluirInactivos?: boolean): Promise<Suplemento[]>;
}

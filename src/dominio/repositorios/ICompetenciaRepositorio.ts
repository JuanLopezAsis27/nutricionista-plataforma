import type { Competencia } from "../entidades/Competencia";

/**
 * Contrato de persistencia de las competencias del calendario deportivo.
 * Tabla de inquilino: la extensión de Prisma aplica el aislamiento por nutri.
 */
export interface ICompetenciaRepositorio {
  crear(competencia: Competencia): Promise<Competencia>;
  actualizar(competencia: Competencia): Promise<Competencia>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Competencia | null>;
  /** Competencias del paciente, de la más próxima a la más lejana. */
  listarPorPaciente(pacienteId: string): Promise<Competencia[]>;
}

import type { PerfilDeportivo } from "../entidades/PerfilDeportivo";

/**
 * Contrato de persistencia del perfil deportivo (uno por paciente).
 * Es tabla de inquilino: el aislamiento por nutricionista lo aplica la
 * extensión de Prisma según el alcance de la request.
 */
export interface IPerfilDeportivoRepositorio {
  obtenerPorPaciente(pacienteId: string): Promise<PerfilDeportivo | null>;
  /** Crea o actualiza el perfil del paciente (upsert por pacienteId). */
  guardar(perfil: PerfilDeportivo): Promise<PerfilDeportivo>;
  eliminarPorPaciente(pacienteId: string): Promise<void>;
}

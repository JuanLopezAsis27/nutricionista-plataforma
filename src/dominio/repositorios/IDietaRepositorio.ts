import type { Dieta } from "../entidades/Dieta";

/**
 * Representa la vinculación de una dieta a un paciente durante un período.
 * Se modela como tipo de dominio (no entidad rica) por simplicidad.
 */
export interface AsignacionDieta {
  id: string;
  dietaId: string;
  pacienteId: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  activa: boolean;
}

/**
 * Contrato del repositorio de Dieta (puerto de salida del dominio).
 *
 * Incluye operaciones sobre las asignaciones porque el caso de uso
 * AsignarDietaAPaciente necesita consultar/actualizar la dieta activa del
 * paciente (regla: una sola dieta activa por paciente), y EliminarDieta
 * necesita saber si la dieta tiene asignaciones activas.
 */
export interface IDietaRepositorio {
  crear(dieta: Dieta): Promise<Dieta>;
  actualizar(dieta: Dieta): Promise<Dieta>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Dieta | null>;
  listar(): Promise<Dieta[]>;
  /** Cantidad de asignaciones activas que apuntan a una dieta. */
  contarAsignacionesActivasDeDieta(dietaId: string): Promise<number>;

  // --- Asignaciones ---
  asignarAPaciente(asignacion: AsignacionDieta): Promise<AsignacionDieta>;
  desactivarAsignacionesDe(pacienteId: string): Promise<void>;
  obtenerAsignacionActiva(pacienteId: string): Promise<AsignacionDieta | null>;
  obtenerDietaActivaDePaciente(pacienteId: string): Promise<Dieta | null>;
}

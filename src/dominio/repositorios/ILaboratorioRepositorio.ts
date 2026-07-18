import type { Laboratorio } from "../entidades/Laboratorio";

/**
 * Contrato de persistencia para los laboratorios.
 * Los archivoIds referencian metadatos ya subidos (módulo Archivos); el
 * repositorio los vincula al laboratorio y los devuelve como adjuntos.
 */
export interface ILaboratorioRepositorio {
  crear(laboratorio: Laboratorio, archivoIds: string[]): Promise<Laboratorio>;
  /** Actualiza los datos y vincula los archivos nuevos (no desvincula). */
  actualizar(laboratorio: Laboratorio, archivoIdsNuevos: string[]): Promise<Laboratorio>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Laboratorio | null>;
  /** Laboratorios del paciente ordenados por fecha descendente. */
  listarPorPaciente(pacienteId: string): Promise<Laboratorio[]>;
}

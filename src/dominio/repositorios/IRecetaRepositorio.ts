import type { Receta } from "../entidades/Receta";

/** Filtro opcional para listar recetas. */
export interface FiltroRecetas {
  texto?: string; // busca en nombre/descripción
  etiqueta?: string;
}

/**
 * Contrato de persistencia del recetario.
 * Los fotoIds referencian archivos ya subidos al bucket (módulo Archivos); el
 * repositorio los vincula a la receta y los devuelve como fotos. Incluye las
 * asignaciones receta⇄paciente (comparto de recetas en el portal).
 */
export interface IRecetaRepositorio {
  crear(receta: Receta, fotoIds: string[]): Promise<Receta>;
  /** Actualiza los datos y vincula las fotos nuevas (no desvincula las viejas). */
  actualizar(receta: Receta, fotoIdsNuevos: string[]): Promise<Receta>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Receta | null>;
  listar(filtro?: FiltroRecetas): Promise<Receta[]>;

  // --- Asignaciones a pacientes ---
  asignarAPaciente(recetaId: string, pacienteId: string, id: string): Promise<void>;
  desasignarDePaciente(recetaId: string, pacienteId: string): Promise<void>;
  listarPorPaciente(pacienteId: string): Promise<Receta[]>;
  /** Ids de los pacientes que tienen asignada la receta. */
  listarPacientesAsignados(recetaId: string): Promise<string[]>;
}

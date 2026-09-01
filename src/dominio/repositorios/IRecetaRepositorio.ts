import type { Receta } from "../entidades/Receta";

/** Filtro opcional para listar recetas. */
export interface FiltroRecetas {
  texto?: string; // busca en nombre/descripción
  etiqueta?: string;
  /**
   * Carpeta en la que buscar. `null` filtra las SUELTAS (las que no están en
   * ninguna); ausente no filtra por carpeta. Es la misma distinción de tres
   * estados que usa el listado de planes, y por eso se compara contra
   * `undefined` y no con un `if (filtro?.grupoId)`.
   */
  grupoId?: string | null;
  /** Paginación server-side: cuántas traer y desde qué offset. */
  limite?: number;
  desplazamiento?: number;
}

/**
 * Contrato de persistencia del recetario.
 * Los archivoIds referencian archivos ya subidos al bucket (módulo Archivos):
 * fotos (imágenes) y documentos (PDF/Word). El repositorio los vincula a la
 * receta y los devuelve separados por tipo (según su MIME). Incluye las
 * asignaciones receta⇄paciente (comparto de recetas en el portal).
 */
export interface IRecetaRepositorio {
  crear(receta: Receta, archivoIds: string[]): Promise<Receta>;
  /** Actualiza los datos y vincula los archivos nuevos (no desvincula los viejos). */
  actualizar(receta: Receta, archivoIdsNuevos: string[]): Promise<Receta>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Receta | null>;
  listar(filtro?: FiltroRecetas): Promise<Receta[]>;
  /** Cuenta las recetas que matchean el filtro (ignora la paginación). */
  contar(filtro?: FiltroRecetas): Promise<number>;
  /** Mueve la receta a una carpeta, o la saca (null). Solo toca `grupoId`. */
  moverAGrupo(id: string, grupoId: string | null): Promise<void>;

  // --- Asignaciones a pacientes ---
  asignarAPaciente(
    recetaId: string,
    pacienteId: string,
    id: string,
  ): Promise<void>;
  desasignarDePaciente(recetaId: string, pacienteId: string): Promise<void>;
  listarPorPaciente(pacienteId: string): Promise<Receta[]>;
  /** Ids de los pacientes que tienen asignada la receta. */
  listarPacientesAsignados(recetaId: string): Promise<string[]>;
}

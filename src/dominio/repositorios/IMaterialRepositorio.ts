import type { MaterialBiblioteca } from "../entidades/MaterialBiblioteca";

/** Filtro opcional para listar materiales. */
export interface FiltroMateriales {
  texto?: string; // busca en título/descripción
  categoria?: string;
  etiqueta?: string;
  /**
   * Carpeta en la que buscar. `null` filtra los SUELTOS; ausente no filtra por
   * carpeta. Es la misma distinción de tres estados que en las recetas: por
   * eso se compara contra `undefined` y no con un `if (filtro?.grupoId)`.
   */
  grupoId?: string | null;
  /** Paginación server-side. */
  limite?: number;
  desplazamiento?: number;
}

/**
 * Contrato de persistencia de la biblioteca de materiales.
 * `crear` recibe el archivoId ya subido (tipo ARCHIVO) y lo vincula fijando
 * Archivo.materialId. Incluye las asignaciones material⇄paciente.
 */
export interface IMaterialRepositorio {
  crear(
    material: MaterialBiblioteca,
    archivoId?: string | null,
  ): Promise<MaterialBiblioteca>;
  actualizar(material: MaterialBiblioteca): Promise<MaterialBiblioteca>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<MaterialBiblioteca | null>;
  listar(filtro?: FiltroMateriales): Promise<MaterialBiblioteca[]>;
  /** Cuenta los materiales que matchean el filtro (ignora la paginación). */
  contar(filtro?: FiltroMateriales): Promise<number>;
  /** Mueve el material a una carpeta, o lo saca (null). Solo toca `grupoId`. */
  moverAGrupo(id: string, grupoId: string | null): Promise<void>;

  // --- Asignaciones a pacientes ---
  asignarAPaciente(
    materialId: string,
    pacienteId: string,
    id: string,
  ): Promise<void>;
  /**
   * Comparte el material con varios pacientes en UNA escritura. Los que ya lo
   * tenían se saltean (idempotente); devuelve cuántas asignaciones son nuevas.
   */
  asignarAPacientes(materialId: string, pacienteIds: string[]): Promise<number>;
  desasignarDePaciente(materialId: string, pacienteId: string): Promise<void>;
  listarPorPaciente(pacienteId: string): Promise<MaterialBiblioteca[]>;
  /** Ids de los pacientes que tienen asignado el material. */
  listarPacientesAsignados(materialId: string): Promise<string[]>;
}

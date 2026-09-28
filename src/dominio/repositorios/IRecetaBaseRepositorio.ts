import type { Receta } from "../entidades/Receta";

/** Filtro del listado del catálogo. */
export interface FiltroRecetasBase {
  /** Busca en nombre y descripción. */
  texto?: string;
  /** Solo las que llevan esa etiqueta. */
  etiqueta?: string;
  limite?: number;
  desplazamiento?: number;
}

/**
 * Contrato de persistencia de las recetas PREDETERMINADAS de la plataforma
 * (migración 82).
 *
 * Se modelan con la misma entidad `Receta` que el recetario de un consultorio:
 * tienen los mismos invariantes y la misma cuenta de macros (por porción, de
 * sus ingredientes). Lo que no tienen es lo que es de un consultorio: fotos,
 * carpeta y pacientes asignados. Un consultorio no las usa directamente: las
 * copia a su recetario (`CopiarRecetaBaseAlRecetario`).
 *
 * No son de ningún inquilino: el repositorio no filtra por consultorio.
 */
export interface IRecetaBaseRepositorio {
  crear(receta: Receta): Promise<Receta>;
  actualizar(receta: Receta): Promise<Receta>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Receta | null>;
  listar(filtro?: FiltroRecetasBase): Promise<Receta[]>;
  contar(filtro?: FiltroRecetasBase): Promise<number>;
  /** Las etiquetas que usa el catálogo, sin repetir y ordenadas: los filtros. */
  listarEtiquetas(): Promise<string[]>;
}

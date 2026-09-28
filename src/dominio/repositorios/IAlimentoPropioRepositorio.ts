import type {
  AlimentoPropio,
  CategoriaAlimento,
} from "../entidades/AlimentoPropio";

/** Criterios opcionales de paginación y búsqueda para listar la gestión. */
export interface FiltroAlimentosPropios {
  busqueda?: string;
  /** Solo los de esa categoría (migración 84). */
  categoria?: CategoriaAlimento;
  limite?: number;
  desplazamiento?: number;
}

/**
 * Contrato de persistencia de una lista de alimentos. Lo implementan la lista
 * propia de un consultorio y el catálogo de la plataforma (migración 82): son
 * la misma colección con otro dueño.
 */
export interface IAlimentoPropioRepositorio {
  /**
   * Reemplaza TODA la lista por la nueva (borra la anterior e inserta las
   * nuevas de forma atómica). Devuelve cuántos quedaron. Escribe lo que
   * recibe, imagen y categoría incluidas: qué se conserva de la lista
   * anterior lo decide el caso de uso.
   */
  reemplazarTodos(alimentos: AlimentoPropio[]): Promise<number>;
  /** Alta de un alimento individual (gestión manual de la lista). */
  crear(alimento: AlimentoPropio): Promise<AlimentoPropio>;
  /** Edición de un alimento individual (imagen incluida). */
  actualizar(alimento: AlimentoPropio): Promise<AlimentoPropio>;
  /** Baja de un alimento individual. */
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<AlimentoPropio | null>;
  /**
   * El alimento con esa clave de identidad (`AlimentoPropio.claveIdentidad`),
   * si ya está en la lista. Es lo que usan el alta y la edición para no
   * duplicar.
   */
  obtenerPorClave(clave: string): Promise<AlimentoPropio | null>;
  /**
   * De estas claves de identidad, las que ya están en la lista. Lo usa la
   * importación para decir cuántas filas coinciden con el catálogo de la
   * plataforma sin pedir los alimentos uno por uno.
   */
  clavesExistentes(claves: string[]): Promise<string[]>;
  /** Listado paginado (con búsqueda y categoría opcionales). */
  listar(filtro?: FiltroAlimentosPropios): Promise<AlimentoPropio[]>;
  /**
   * Busca por texto en el nombre (case-insensitive) y/o por categoría.
   * Con categoría, el texto puede venir vacío: es «ver los lácteos».
   * Máximo `limite`.
   */
  buscar(
    termino: string,
    limite: number,
    categoria?: CategoriaAlimento,
  ): Promise<AlimentoPropio[]>;
  /** Cantidad de alimentos cargados (con el mismo filtro que `listar`). */
  contar(filtro?: FiltroAlimentosPropios): Promise<number>;
  /** Borra toda la lista (reactiva Open Food Facts si no queda otra). */
  vaciar(): Promise<void>;
  /**
   * Las claves del bucket de las imágenes en uso. Las pide el barrido de
   * huérfanos: una imagen de alimento no es un `Archivo`, y sin esto el
   * barrido la borraría por no encontrarla en `archivos`. Se llama con
   * alcance GLOBAL (la lista de todos los consultorios).
   */
  listarClavesDeImagen(): Promise<string[]>;
}

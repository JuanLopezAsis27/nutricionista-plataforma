import type { PlanificacionDeportiva } from "../entidades/PlanificacionDeportiva";

/** Criterios de un listado de planificaciones. */
export interface FiltroPlanificaciones {
  /** Parte del nombre, sin distinguir mayúsculas. */
  texto?: string;
  /**
   * `undefined` = todas; `null` = solo las sueltas (sin carpeta); un id = las
   * de esa carpeta. La raíz del navegador lista las sueltas: si listara todas,
   * las de una carpeta aparecerían dos veces.
   */
  grupoId?: string | null;
  limite?: number;
  desplazamiento?: number;
}

/**
 * Contrato de persistencia de las planificaciones deportivas (migración 94).
 * Persiste el agregado entero —datos del deporte e ingestas con sus
 * alimentos— de forma atómica.
 */
export interface IPlanificacionDeportivaRepositorio {
  crear(planificacion: PlanificacionDeportiva): Promise<PlanificacionDeportiva>;
  /**
   * Reemplaza el contenido entero (datos, ingestas y alimentos). Con
   * `esperadoEn` (el `actualizadoEn` que leyó el formulario), no escribe nada
   * si la fila ya cambió y lanza `ErrorEdicionConcurrente`: como reemplaza a
   * todos los hijos, una edición concurrente no perdería un campo sino que
   * rehacería la planificación desde una foto vieja. Ver `IPlanRepositorio`.
   */
  actualizar(
    planificacion: PlanificacionDeportiva,
    esperadoEn?: Date,
  ): Promise<PlanificacionDeportiva>;
  /** Se lleva sus ingestas y sus asignaciones (cascada). */
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<PlanificacionDeportiva | null>;
  /** Por nombre. */
  listar(filtro?: FiltroPlanificaciones): Promise<PlanificacionDeportiva[]>;
  contar(filtro?: FiltroPlanificaciones): Promise<number>;
  /** ¿Ya hay una con ese nombre (sin distinguir mayúsculas)? */
  existeNombre(nombre: string, excluirId?: string): Promise<boolean>;
  /** Toca solo la carpeta: ordenar no es editar. */
  moverAGrupo(id: string, grupoId: string | null): Promise<void>;
}

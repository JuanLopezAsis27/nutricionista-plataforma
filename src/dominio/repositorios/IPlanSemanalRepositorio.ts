import type { PlanSemanal } from "../entidades/PlanSemanal";

/** Filtro para listar planes semanales. */
export interface FiltroPlanesSemanales {
  texto?: string;
  /** Paginación server-side. */
  limite?: number;
  desplazamiento?: number;
}

/**
 * Contrato del repositorio de Planes Semanales (puerto de salida).
 *
 * `crear`/`actualizar` persisten el agregado completo —franjas, comidas y
 * alimentos— de forma atómica; `actualizar` REEMPLAZA los hijos, igual que en
 * el plan nutricional: la grilla que llega es la que queda.
 *
 * Las asignaciones plan semanal ⇄ paciente viven en
 * `IAsignacionPlanSemanalRepositorio` por el mismo motivo que las del plan:
 * son otro agregado, con otro ciclo de vida, y casi ningún consumidor necesita
 * los dos.
 */
export interface IPlanSemanalRepositorio {
  crear(plan: PlanSemanal): Promise<PlanSemanal>;
  actualizar(plan: PlanSemanal): Promise<PlanSemanal>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<PlanSemanal | null>;
  listar(filtro?: FiltroPlanesSemanales): Promise<PlanSemanal[]>;
  /** Cuenta los planes que matchean el filtro (ignora la paginación). */
  contar(filtro?: FiltroPlanesSemanales): Promise<number>;
  /**
   * ¿Ya hay un plan semanal con ese nombre? `excluirId` deja que uno se
   * renombre a sí mismo.
   */
  existeNombre(nombre: string, excluirId?: string): Promise<boolean>;
}

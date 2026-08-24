import type { PlanNutricional } from "../entidades/PlanNutricional";

/**
 * Vinculación de un plan a un paciente durante un período.
 * Se modela como tipo de dominio (no entidad rica) por simplicidad.
 */
export interface AsignacionPlan {
  id: string;
  planId: string;
  pacienteId: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  activa: boolean;
}

/** Filtro para listar planes. */
export interface FiltroPlanes {
  esPlantilla?: boolean;
  incluirArchivados?: boolean;
  texto?: string;
  /** Paginación server-side. */
  limite?: number;
  desplazamiento?: number;
}

/**
 * Contrato del repositorio de Planes Nutricionales (puerto de salida).
 *
 * `crear`/`actualizar` persisten el agregado completo (franjas, opciones,
 * equivalencias, recomendaciones) de forma atómica; `actualizar` reemplaza
 * los hijos. Incluye las asignaciones plan⇄paciente porque los casos de uso
 * de asignación necesitan la regla "un plan activo por paciente".
 */
export interface IPlanRepositorio {
  crear(plan: PlanNutricional): Promise<PlanNutricional>;
  actualizar(plan: PlanNutricional): Promise<PlanNutricional>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<PlanNutricional | null>;
  listar(filtro?: FiltroPlanes): Promise<PlanNutricional[]>;
  /** Cuenta los planes que matchean el filtro (ignora la paginación). */
  contar(filtro?: FiltroPlanes): Promise<number>;
  marcarArchivado(id: string, archivado: boolean): Promise<void>;
  /** Cantidad de asignaciones activas que apuntan a un plan. */
  contarAsignacionesActivasDePlan(planId: string): Promise<number>;

  // --- Asignaciones ---
  asignarAPaciente(asignacion: AsignacionPlan): Promise<AsignacionPlan>;
  desactivarAsignacionesDe(pacienteId: string): Promise<void>;
  obtenerAsignacionActiva(pacienteId: string): Promise<AsignacionPlan | null>;
  obtenerPlanActivoDePaciente(pacienteId: string): Promise<PlanNutricional | null>;
  /** Asignaciones aún activas cuya fecha de fin ya pasó (para alertas). */
  listarAsignacionesActivasVencidas(fechaLimite: Date): Promise<AsignacionPlan[]>;
}

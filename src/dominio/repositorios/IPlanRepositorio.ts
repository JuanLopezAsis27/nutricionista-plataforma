import type { PlanNutricional } from "../entidades/PlanNutricional";

/**
 * Vinculación de un plan a un paciente durante un período.
 * Se modela como tipo de dominio (no entidad rica) por simplicidad.
 *
 * Las asignaciones son el HISTORIAL del paciente: no se borran, se desactivan,
 * y sobreviven al borrado del plan. Qué siguió y entre qué fechas es
 * información del paciente, no un detalle del plan.
 */
export interface AsignacionPlan {
  id: string;
  /** Null si el plan se borró. La asignación queda igual. */
  planId: string | null;
  /** Nombre del plan al asignarlo. Es una foto: sobrevive al borrado y al renombre. */
  nombrePlan: string;
  pacienteId: string;
  fechaInicio: Date;
  /** Fin PLANIFICADO al asignar. No es cuándo terminó de verdad. */
  fechaFin: Date | null;
  /** Cuándo dejó de regir realmente (al reemplazarla o finalizarla). */
  finalizadaEn: Date | null;
  activa: boolean;
}

/** Asignación con el nombre del paciente, para la lista de un plan. */
export interface AsignacionConPaciente extends AsignacionPlan {
  pacienteNombre: string;
  pacienteApellido: string;
}

/** Filtro para listar planes. */
export interface FiltroPlanes {
  esPlantilla?: boolean;
  incluirArchivados?: boolean;
  texto?: string;
  /**
   * Carpeta. `null` filtra los planes SUELTOS (sin carpeta), que es una
   * pregunta distinta de "no filtres por carpeta" —eso es `undefined`—.
   */
  grupoId?: string | null;
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
 *
 * `archivoIds` son los archivos que quedan vinculados al plan —el principal y
 * los anexos—. Se suben ANTES de que el plan exista (el bucket no espera a que
 * haya id) y se vinculan acá, igual que los adjuntos de una receta. La lista es
 * el estado final: lo que no está en ella se desvincula.
 */
export interface IPlanRepositorio {
  crear(plan: PlanNutricional, archivoIds: string[]): Promise<PlanNutricional>;
  actualizar(
    plan: PlanNutricional,
    archivoIds: string[],
  ): Promise<PlanNutricional>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<PlanNutricional | null>;
  listar(filtro?: FiltroPlanes): Promise<PlanNutricional[]>;
  /** Cuenta los planes que matchean el filtro (ignora la paginación). */
  contar(filtro?: FiltroPlanes): Promise<number>;
  marcarArchivado(id: string, archivado: boolean): Promise<void>;
  /** Cambia SOLO la carpeta del plan. `null` lo deja suelto. */
  moverAGrupo(id: string, grupoId: string | null): Promise<void>;
  /** Cantidad de asignaciones activas que apuntan a un plan. */
  contarAsignacionesActivasDePlan(planId: string): Promise<number>;
  /**
   * ¿Ya hay un plan con ese nombre en el mismo espacio (plan o plantilla)?
   * `excluirId` deja que un plan se renombre a sí mismo.
   */
  existeNombre(
    nombre: string,
    esPlantilla: boolean,
    excluirId?: string,
  ): Promise<boolean>;

  // --- Asignaciones ---
  asignarAPaciente(asignacion: AsignacionPlan): Promise<AsignacionPlan>;
  /**
   * Cierra las asignaciones activas del paciente dejando registrado CUÁNDO
   * dejaron de regir. La fecha la decide el caso de uso: al reemplazar un plan
   * es el inicio del nuevo, al finalizarlo a mano es hoy.
   */
  desactivarAsignacionesDe(
    pacienteId: string,
    finalizadaEn: Date,
  ): Promise<void>;
  obtenerAsignacionActiva(pacienteId: string): Promise<AsignacionPlan | null>;
  /** Pacientes que tienen o tuvieron este plan, del más reciente al más viejo. */
  listarAsignacionesDePlan(planId: string): Promise<AsignacionConPaciente[]>;
  /** Historial completo de planes del paciente, del más reciente al más viejo. */
  listarAsignacionesDePaciente(pacienteId: string): Promise<AsignacionPlan[]>;
  obtenerPlanActivoDePaciente(
    pacienteId: string,
  ): Promise<PlanNutricional | null>;
  /** Asignaciones aún activas cuya fecha de fin ya pasó (para alertas). */
  listarAsignacionesActivasVencidas(
    fechaLimite: Date,
  ): Promise<AsignacionPlan[]>;
}

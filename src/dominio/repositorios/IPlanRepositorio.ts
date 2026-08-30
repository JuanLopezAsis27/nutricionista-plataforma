import type { PlanNutricional } from "../entidades/PlanNutricional";

// Reexporte por compatibilidad: los tipos de asignación se mudaron a su propio
// puerto (ver IAsignacionPlanRepositorio) pero varios módulos los importan
// desde acá, y son parte del mismo vocabulario de planes.
export type {
  AsignacionPlan,
  AsignacionConPaciente,
} from "./IAsignacionPlanRepositorio";

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
 * los hijos.
 *
 * `archivoIds` son los archivos que quedan vinculados al plan —el principal y
 * los anexos—. Se suben ANTES de que el plan exista (el bucket no espera a que
 * haya id) y se vinculan acá, igual que los adjuntos de una receta. La lista es
 * el estado final: lo que no está en ella se desvincula.
 *
 * Las asignaciones plan⇄paciente vivían acá y se movieron a
 * `IAsignacionPlanRepositorio`: son otro agregado, con otro ciclo de vida, y
 * la mayoría de los consumidores necesitaba uno solo de los dos.
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
  /**
   * ¿Ya hay un plan con ese nombre en el mismo espacio (plan o plantilla)?
   * `excluirId` deja que un plan se renombre a sí mismo.
   */
  existeNombre(
    nombre: string,
    esPlantilla: boolean,
    excluirId?: string,
  ): Promise<boolean>;
}

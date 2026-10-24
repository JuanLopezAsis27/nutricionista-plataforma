import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type { IAsignacionPlanificacionRepositorio } from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";
import type { PlanificacionDeportiva } from "@/dominio/entidades/PlanificacionDeportiva";
import {
  desplazamientoDe,
  totalPaginas,
  type ParametrosPagina,
  type Pagina,
} from "../_paginacion";

export interface FiltroListarPlanificaciones extends ParametrosPagina {
  texto?: string;
  /** `undefined` = todas; `null` = las sueltas; un id = las de esa carpeta. */
  grupoId?: string | null;
}

/** Una planificación del listado y a cuántos pacientes está asignada. */
export interface PlanificacionListada {
  planificacion: PlanificacionDeportiva;
  cantidadPacientes: number;
}

/**
 * Caso de uso: listar planificaciones paginadas (server-side), con cuántos
 * pacientes tiene cada una.
 *
 * Los filtros se enumeran a mano, como en `ObtenerPlanesPaginado`: uno que se
 * agregue al DTO y al repositorio sin sumarlo acá se descarta en silencio.
 */
export class ListarPlanificaciones {
  constructor(
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
    private readonly asignaciones: IAsignacionPlanificacionRepositorio,
  ) {}

  async ejecutar(
    filtro: FiltroListarPlanificaciones,
  ): Promise<Pagina<PlanificacionListada>> {
    const base = { texto: filtro.texto, grupoId: filtro.grupoId };
    const [planificaciones, total] = await Promise.all([
      this.planificaciones.listar({
        ...base,
        limite: filtro.porPagina,
        desplazamiento: desplazamientoDe(filtro),
      }),
      this.planificaciones.contar(base),
    ]);
    const pacientes = await this.asignaciones.contarPacientes(
      planificaciones.map((p) => p.id),
    );
    return {
      items: planificaciones.map((planificacion) => ({
        planificacion,
        cantidadPacientes: pacientes.get(planificacion.id) ?? 0,
      })),
      total,
      paginas: totalPaginas(total, filtro.porPagina),
    };
  }
}

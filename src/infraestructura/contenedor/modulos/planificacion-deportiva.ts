import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type { IAsignacionPlanificacionRepositorio } from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";
import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import { CrearPlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/CrearPlanificacion";
import { CrearPlanificacionParaPaciente } from "@/aplicacion/casos-de-uso/planificacion-deportiva/CrearPlanificacionParaPaciente";
import { ActualizarPlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ActualizarPlanificacion";
import { EliminarPlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/EliminarPlanificacion";
import { DuplicarPlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/DuplicarPlanificacion";
import { ObtenerPlanificacionPorId } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ObtenerPlanificacionPorId";
import { ListarPlanificaciones } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ListarPlanificaciones";
import { MoverPlanificacionAGrupo } from "@/aplicacion/casos-de-uso/planificacion-deportiva/MoverPlanificacionAGrupo";
import { AsignarPlanificacionAPaciente } from "@/aplicacion/casos-de-uso/planificacion-deportiva/AsignarPlanificacionAPaciente";
import { DesasignarPlanificacionDePaciente } from "@/aplicacion/casos-de-uso/planificacion-deportiva/DesasignarPlanificacionDePaciente";
import { ObtenerPlanificacionesDelPaciente } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ObtenerPlanificacionesDelPaciente";
import { ObtenerPacientesDePlanificacion } from "@/aplicacion/casos-de-uso/planificacion-deportiva/ObtenerPacientesDePlanificacion";
import { CrearGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/CrearGrupoPlan";
import { ActualizarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ActualizarGrupoPlan";
import { EliminarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/EliminarGrupoPlan";
import { ObtenerGruposPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ObtenerGruposPlan";
import { ServicioPlanificacionDeportiva } from "@/aplicacion/servicios/ServicioPlanificacionDeportiva";

/**
 * Arma el servicio de la planificación deportiva (migración 94). Las carpetas
 * usan los casos de uso de las carpetas de planes con SU repositorio: el
 * cableado es el único lugar que sabe que son la misma regla.
 */
export function crearServicioPlanificacionDeportiva(deps: {
  // La implementación de Prisma sirve los dos puertos.
  planificaciones: IPlanificacionDeportivaRepositorio &
    IAsignacionPlanificacionRepositorio;
  grupos: IGrupoPlanRepositorio;
  pacientes: IPacienteRepositorio;
  competencias: ICompetenciaRepositorio;
}): ServicioPlanificacionDeportiva {
  const crear = new CrearPlanificacion(deps.planificaciones, deps.grupos);
  const asignar = new AsignarPlanificacionAPaciente(
    deps.planificaciones,
    deps.planificaciones,
    deps.pacientes,
    deps.competencias,
  );
  return new ServicioPlanificacionDeportiva(
    crear,
    new CrearPlanificacionParaPaciente(
      crear,
      asignar,
      deps.grupos,
      deps.pacientes,
      deps.competencias,
    ),
    new ActualizarPlanificacion(deps.planificaciones),
    new EliminarPlanificacion(deps.planificaciones),
    new DuplicarPlanificacion(deps.planificaciones),
    new ObtenerPlanificacionPorId(deps.planificaciones),
    new ListarPlanificaciones(deps.planificaciones, deps.planificaciones),
    new MoverPlanificacionAGrupo(deps.planificaciones, deps.grupos),
    asignar,
    new DesasignarPlanificacionDePaciente(deps.planificaciones),
    new ObtenerPlanificacionesDelPaciente(deps.planificaciones),
    new ObtenerPacientesDePlanificacion(deps.planificaciones),
    new ObtenerGruposPlan(deps.grupos),
    new CrearGrupoPlan(deps.grupos),
    new ActualizarGrupoPlan(deps.grupos),
    new EliminarGrupoPlan(deps.grupos),
  );
}

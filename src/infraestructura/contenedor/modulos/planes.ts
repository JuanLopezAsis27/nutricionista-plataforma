import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import { CrearPlan } from "@/aplicacion/casos-de-uso/planes/CrearPlan";
import { ObtenerPlanes } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanes";
import { ObtenerPlanesPaginado } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanesPaginado";
import { ObtenerPlanPorId } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanPorId";
import { ActualizarPlan } from "@/aplicacion/casos-de-uso/planes/ActualizarPlan";
import { EliminarPlan } from "@/aplicacion/casos-de-uso/planes/EliminarPlan";
import { ArchivarPlan } from "@/aplicacion/casos-de-uso/planes/ArchivarPlan";
import { CrearPlanDesdePlantilla } from "@/aplicacion/casos-de-uso/planes/CrearPlanDesdePlantilla";
import { AsignarPlanAPaciente } from "@/aplicacion/casos-de-uso/planes/AsignarPlanAPaciente";
import { DesasignarPlanDePaciente } from "@/aplicacion/casos-de-uso/planes/DesasignarPlanDePaciente";
import { ObtenerPlanDelPaciente } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanDelPaciente";
import { ObtenerPacientesDePlan } from "@/aplicacion/casos-de-uso/planes/ObtenerPacientesDePlan";
import { ObtenerHistorialDePlanes } from "@/aplicacion/casos-de-uso/planes/ObtenerHistorialDePlanes";
import { MoverPlanAGrupo } from "@/aplicacion/casos-de-uso/planes/MoverPlanAGrupo";
import { CrearGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/CrearGrupoPlan";
import { ActualizarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ActualizarGrupoPlan";
import { EliminarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/EliminarGrupoPlan";
import { ObtenerGruposPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ObtenerGruposPlan";
import { ServicioPlan } from "@/aplicacion/servicios/ServicioPlan";

/** Arma el servicio de Planes Nutricionales con sus casos de uso. */
export function crearServicioPlan(deps: {
  planes: IPlanRepositorio;
  pacientes: IPacienteRepositorio;
  grupos: IGrupoPlanRepositorio;
}): ServicioPlan {
  return new ServicioPlan(
    new CrearPlan(deps.planes),
    new ObtenerPlanes(deps.planes),
    new ObtenerPlanesPaginado(deps.planes),
    new ObtenerPlanPorId(deps.planes),
    new ActualizarPlan(deps.planes),
    new EliminarPlan(deps.planes),
    new ArchivarPlan(deps.planes),
    new CrearPlanDesdePlantilla(deps.planes),
    new AsignarPlanAPaciente(deps.planes, deps.pacientes),
    new DesasignarPlanDePaciente(deps.planes),
    new ObtenerPlanDelPaciente(deps.planes),
    new ObtenerPacientesDePlan(deps.planes),
    new ObtenerHistorialDePlanes(deps.planes, deps.pacientes),
    new MoverPlanAGrupo(deps.planes, deps.grupos),
    new CrearGrupoPlan(deps.grupos),
    new ActualizarGrupoPlan(deps.grupos),
    new EliminarGrupoPlan(deps.grupos),
    new ObtenerGruposPlan(deps.grupos),
  );
}

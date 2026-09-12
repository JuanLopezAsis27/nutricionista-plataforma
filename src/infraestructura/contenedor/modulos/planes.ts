import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import { CrearPlan } from "@/aplicacion/casos-de-uso/planes/CrearPlan";
import { ObtenerPlanes } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanes";
import { ObtenerPlanesPaginado } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanesPaginado";
import { ObtenerPlanPorId } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanPorId";
import { ActualizarPlan } from "@/aplicacion/casos-de-uso/planes/ActualizarPlan";
import { EliminarPlan } from "@/aplicacion/casos-de-uso/planes/EliminarPlan";
import { ArchivarPlan } from "@/aplicacion/casos-de-uso/planes/ArchivarPlan";
import { CrearPlanDesdePlantilla } from "@/aplicacion/casos-de-uso/planes/CrearPlanDesdePlantilla";
import { AsignarPlanAPaciente } from "@/aplicacion/casos-de-uso/planes/AsignarPlanAPaciente";
import { AsignarPlanAVariosPacientes } from "@/aplicacion/casos-de-uso/planes/AsignarPlanAVariosPacientes";
import { CrearPlanParaPaciente } from "@/aplicacion/casos-de-uso/planes/CrearPlanParaPaciente";
import { DesasignarPlanDePaciente } from "@/aplicacion/casos-de-uso/planes/DesasignarPlanDePaciente";
import { ObtenerPlanDelPaciente } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanDelPaciente";
import { ObtenerPacientesDePlan } from "@/aplicacion/casos-de-uso/planes/ObtenerPacientesDePlan";
import { ObtenerHistorialDePlanes } from "@/aplicacion/casos-de-uso/planes/ObtenerHistorialDePlanes";
import { SincronizarRecetasDePlan } from "@/aplicacion/casos-de-uso/planes/SincronizarRecetasDePlan";
import { MoverPlanAGrupo } from "@/aplicacion/casos-de-uso/planes/MoverPlanAGrupo";
import { CrearGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/CrearGrupoPlan";
import { ActualizarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ActualizarGrupoPlan";
import { EliminarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/EliminarGrupoPlan";
import { ObtenerGruposPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ObtenerGruposPlan";
import { ServicioPlan } from "@/aplicacion/servicios/ServicioPlan";

/** Arma el servicio de Planes Nutricionales con sus casos de uso. */
export function crearServicioPlan(deps: {
  // La implementación de Prisma sirve los dos puertos; el cableado es el
  // único lugar que necesita saberlo.
  planes: IPlanRepositorio & IAsignacionPlanRepositorio;
  pacientes: IPacienteRepositorio;
  grupos: IGrupoPlanRepositorio;
  recetas: IRecetaRepositorio;
}): ServicioPlan {
  const asignarUC = new AsignarPlanAPaciente(
    deps.planes,
    deps.planes,
    deps.pacientes,
  );
  const crearUC = new CrearPlan(deps.planes);
  return new ServicioPlan(
    crearUC,
    new ObtenerPlanes(deps.planes),
    new ObtenerPlanesPaginado(deps.planes),
    new ObtenerPlanPorId(deps.planes),
    new ActualizarPlan(deps.planes),
    new EliminarPlan(deps.planes, deps.planes),
    new ArchivarPlan(deps.planes),
    new CrearPlanDesdePlantilla(deps.planes),
    asignarUC,
    new AsignarPlanAVariosPacientes(asignarUC),
    new CrearPlanParaPaciente(crearUC, asignarUC, deps.grupos, deps.pacientes),
    new DesasignarPlanDePaciente(deps.planes),
    new ObtenerPlanDelPaciente(deps.planes),
    new ObtenerPacientesDePlan(deps.planes, deps.planes),
    new ObtenerHistorialDePlanes(deps.planes, deps.pacientes),
    new SincronizarRecetasDePlan(deps.planes, deps.planes, deps.recetas),
    new MoverPlanAGrupo(deps.planes, deps.grupos),
    new CrearGrupoPlan(deps.grupos),
    new ActualizarGrupoPlan(deps.grupos),
    new EliminarGrupoPlan(deps.grupos),
    new ObtenerGruposPlan(deps.grupos),
  );
}

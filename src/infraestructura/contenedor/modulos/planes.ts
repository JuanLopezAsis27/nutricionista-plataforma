import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { CrearPlan } from "@/dominio/casos-de-uso/planes/CrearPlan";
import { ObtenerPlanes } from "@/dominio/casos-de-uso/planes/ObtenerPlanes";
import { ObtenerPlanPorId } from "@/dominio/casos-de-uso/planes/ObtenerPlanPorId";
import { ActualizarPlan } from "@/dominio/casos-de-uso/planes/ActualizarPlan";
import { EliminarPlan } from "@/dominio/casos-de-uso/planes/EliminarPlan";
import { ArchivarPlan } from "@/dominio/casos-de-uso/planes/ArchivarPlan";
import { CrearPlanDesdePlantilla } from "@/dominio/casos-de-uso/planes/CrearPlanDesdePlantilla";
import { AsignarPlanAPaciente } from "@/dominio/casos-de-uso/planes/AsignarPlanAPaciente";
import { DesasignarPlanDePaciente } from "@/dominio/casos-de-uso/planes/DesasignarPlanDePaciente";
import { ObtenerPlanDelPaciente } from "@/dominio/casos-de-uso/planes/ObtenerPlanDelPaciente";
import { ServicioPlan } from "@/aplicacion/servicios/ServicioPlan";

/** Arma el servicio de Planes Nutricionales con sus casos de uso. */
export function crearServicioPlan(deps: {
  planes: IPlanRepositorio;
  pacientes: IPacienteRepositorio;
}): ServicioPlan {
  return new ServicioPlan(
    new CrearPlan(deps.planes),
    new ObtenerPlanes(deps.planes),
    new ObtenerPlanPorId(deps.planes),
    new ActualizarPlan(deps.planes),
    new EliminarPlan(deps.planes),
    new ArchivarPlan(deps.planes),
    new CrearPlanDesdePlantilla(deps.planes),
    new AsignarPlanAPaciente(deps.planes, deps.pacientes),
    new DesasignarPlanDePaciente(deps.planes),
    new ObtenerPlanDelPaciente(deps.planes),
  );
}

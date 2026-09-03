import type { IPlanSemanalRepositorio } from "@/dominio/repositorios/IPlanSemanalRepositorio";
import type { IAsignacionPlanSemanalRepositorio } from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { CrearPlanSemanal } from "@/aplicacion/casos-de-uso/planes-semanales/CrearPlanSemanal";
import { ActualizarPlanSemanal } from "@/aplicacion/casos-de-uso/planes-semanales/ActualizarPlanSemanal";
import { EliminarPlanSemanal } from "@/aplicacion/casos-de-uso/planes-semanales/EliminarPlanSemanal";
import { ObtenerPlanSemanalPorId } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerPlanSemanalPorId";
import { ObtenerPlanesSemanalesPaginado } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerPlanesSemanalesPaginado";
import { AsignarPlanSemanalAPaciente } from "@/aplicacion/casos-de-uso/planes-semanales/AsignarPlanSemanalAPaciente";
import { DesasignarPlanSemanalDePaciente } from "@/aplicacion/casos-de-uso/planes-semanales/DesasignarPlanSemanalDePaciente";
import { ObtenerPlanSemanalDelPaciente } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerPlanSemanalDelPaciente";
import { ObtenerHistorialDePlanesSemanales } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerHistorialDePlanesSemanales";
import { ObtenerPacientesDePlanSemanal } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerPacientesDePlanSemanal";
import { ServicioPlanSemanal } from "@/aplicacion/servicios/ServicioPlanSemanal";

/**
 * Arma el servicio de Planes Semanales con sus casos de uso.
 *
 * Recibe TAMBIÉN el repositorio de asignaciones de plan nutricional: las metas
 * diarias contra las que se compara cada día del menú salen del plan que el
 * paciente tiene asignado, no del plan semanal.
 */
export function crearServicioPlanSemanal(deps: {
  // La implementación de Prisma sirve los dos puertos; el cableado es el único
  // lugar que necesita saberlo.
  semanales: IPlanSemanalRepositorio & IAsignacionPlanSemanalRepositorio;
  planes: IAsignacionPlanRepositorio;
  pacientes: IPacienteRepositorio;
}): ServicioPlanSemanal {
  return new ServicioPlanSemanal(
    new CrearPlanSemanal(deps.semanales),
    new ActualizarPlanSemanal(deps.semanales),
    new EliminarPlanSemanal(deps.semanales, deps.semanales),
    new ObtenerPlanSemanalPorId(deps.semanales),
    new ObtenerPlanesSemanalesPaginado(deps.semanales),
    new AsignarPlanSemanalAPaciente(
      deps.semanales,
      deps.semanales,
      deps.pacientes,
    ),
    new DesasignarPlanSemanalDePaciente(deps.semanales),
    new ObtenerPlanSemanalDelPaciente(deps.semanales, deps.planes),
    new ObtenerHistorialDePlanesSemanales(deps.semanales, deps.pacientes),
    new ObtenerPacientesDePlanSemanal(deps.semanales, deps.semanales),
  );
}

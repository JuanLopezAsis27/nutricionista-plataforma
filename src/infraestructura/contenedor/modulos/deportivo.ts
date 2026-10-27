import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IDeporteRepositorio } from "@/dominio/repositorios/IDeporteRepositorio";
import { ObtenerPerfilDeportivo } from "@/aplicacion/casos-de-uso/deportivo/ObtenerPerfilDeportivo";
import { GuardarPerfilDeportivo } from "@/aplicacion/casos-de-uso/deportivo/GuardarPerfilDeportivo";
import { ListarCompetencias } from "@/aplicacion/casos-de-uso/deportivo/ListarCompetencias";
import { CrearCompetencia } from "@/aplicacion/casos-de-uso/deportivo/CrearCompetencia";
import { ActualizarCompetencia } from "@/aplicacion/casos-de-uso/deportivo/ActualizarCompetencia";
import { EliminarCompetencia } from "@/aplicacion/casos-de-uso/deportivo/EliminarCompetencia";
import { ServicioDeportivo } from "@/aplicacion/servicios/ServicioDeportivo";
import { ListarDeportes } from "@/aplicacion/casos-de-uso/deportes/ListarDeportes";
import { CrearDeporte } from "@/aplicacion/casos-de-uso/deportes/CrearDeporte";
import { RenombrarDeporte } from "@/aplicacion/casos-de-uso/deportes/RenombrarDeporte";
import { EliminarDeporte } from "@/aplicacion/casos-de-uso/deportes/EliminarDeporte";
import { CambiarPlanificacionDeDeporte } from "@/aplicacion/casos-de-uso/deportes/CambiarPlanificacionDeDeporte";
import { ServicioDeportes } from "@/aplicacion/servicios/ServicioDeportes";

/** Arma el servicio del módulo deportivo con sus casos de uso. */
export function crearServicioDeportivo(deps: {
  perfiles: IPerfilDeportivoRepositorio;
  competencias: ICompetenciaRepositorio;
  pacientes: IPacienteRepositorio;
  deportes: IDeporteRepositorio;
}): ServicioDeportivo {
  return new ServicioDeportivo(
    new ObtenerPerfilDeportivo(deps.perfiles, deps.pacientes),
    new GuardarPerfilDeportivo(deps.perfiles, deps.pacientes, deps.deportes),
    new ListarCompetencias(deps.competencias, deps.pacientes),
    new CrearCompetencia(deps.competencias, deps.pacientes),
    new ActualizarCompetencia(deps.competencias),
    new EliminarCompetencia(deps.competencias),
  );
}

/**
 * La lista de deportes de la plataforma (migración 97). Una sola instancia:
 * la leen los consultorios y la escribe el SUPERADMIN (el router decide).
 */
export function crearServicioDeportes(deps: {
  deportes: IDeporteRepositorio;
  perfiles: IPerfilDeportivoRepositorio;
}): ServicioDeportes {
  return new ServicioDeportes(
    new ListarDeportes(deps.deportes),
    new CrearDeporte(deps.deportes),
    new RenombrarDeporte(deps.deportes),
    new EliminarDeporte(deps.deportes, deps.perfiles),
    new CambiarPlanificacionDeDeporte(deps.deportes),
  );
}

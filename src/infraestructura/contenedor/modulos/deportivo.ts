import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ObtenerPerfilDeportivo } from "@/aplicacion/casos-de-uso/deportivo/ObtenerPerfilDeportivo";
import { GuardarPerfilDeportivo } from "@/aplicacion/casos-de-uso/deportivo/GuardarPerfilDeportivo";
import { ListarCompetencias } from "@/aplicacion/casos-de-uso/deportivo/ListarCompetencias";
import { CrearCompetencia } from "@/aplicacion/casos-de-uso/deportivo/CrearCompetencia";
import { ActualizarCompetencia } from "@/aplicacion/casos-de-uso/deportivo/ActualizarCompetencia";
import { EliminarCompetencia } from "@/aplicacion/casos-de-uso/deportivo/EliminarCompetencia";
import { ServicioDeportivo } from "@/aplicacion/servicios/ServicioDeportivo";

/** Arma el servicio del módulo deportivo con sus casos de uso. */
export function crearServicioDeportivo(deps: {
  perfiles: IPerfilDeportivoRepositorio;
  competencias: ICompetenciaRepositorio;
  pacientes: IPacienteRepositorio;
}): ServicioDeportivo {
  return new ServicioDeportivo(
    new ObtenerPerfilDeportivo(deps.perfiles, deps.pacientes),
    new GuardarPerfilDeportivo(deps.perfiles, deps.pacientes),
    new ListarCompetencias(deps.competencias, deps.pacientes),
    new CrearCompetencia(deps.competencias, deps.pacientes),
    new ActualizarCompetencia(deps.competencias),
    new EliminarCompetencia(deps.competencias),
  );
}

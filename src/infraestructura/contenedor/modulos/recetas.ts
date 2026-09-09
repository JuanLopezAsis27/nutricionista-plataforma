import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IGrupoRecetaRepositorio } from "@/dominio/repositorios/IGrupoRecetaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { CrearReceta } from "@/aplicacion/casos-de-uso/recetas/CrearReceta";
import { ObtenerRecetas } from "@/aplicacion/casos-de-uso/recetas/ObtenerRecetas";
import { ObtenerRecetasPaginado } from "@/aplicacion/casos-de-uso/recetas/ObtenerRecetasPaginado";
import { ObtenerRecetaPorId } from "@/aplicacion/casos-de-uso/recetas/ObtenerRecetaPorId";
import { ActualizarReceta } from "@/aplicacion/casos-de-uso/recetas/ActualizarReceta";
import { EliminarReceta } from "@/aplicacion/casos-de-uso/recetas/EliminarReceta";
import { EliminarArchivoDeReceta } from "@/aplicacion/casos-de-uso/recetas/EliminarArchivoDeReceta";
import { MarcarFotoPrincipal } from "@/aplicacion/casos-de-uso/recetas/MarcarFotoPrincipal";
import { AsignarRecetaAPaciente } from "@/aplicacion/casos-de-uso/recetas/AsignarRecetaAPaciente";
import { DesasignarRecetaDePaciente } from "@/aplicacion/casos-de-uso/recetas/DesasignarRecetaDePaciente";
import { ObtenerRecetasDelPaciente } from "@/aplicacion/casos-de-uso/recetas/ObtenerRecetasDelPaciente";
import { ObtenerPacientesDeReceta } from "@/aplicacion/casos-de-uso/recetas/ObtenerPacientesDeReceta";
import { MoverRecetaAGrupo } from "@/aplicacion/casos-de-uso/recetas/MoverRecetaAGrupo";
import { CrearGrupoReceta } from "@/aplicacion/casos-de-uso/grupos-receta/CrearGrupoReceta";
import { ActualizarGrupoReceta } from "@/aplicacion/casos-de-uso/grupos-receta/ActualizarGrupoReceta";
import { EliminarGrupoReceta } from "@/aplicacion/casos-de-uso/grupos-receta/EliminarGrupoReceta";
import { ObtenerGruposReceta } from "@/aplicacion/casos-de-uso/grupos-receta/ObtenerGruposReceta";
import { ServicioReceta } from "@/aplicacion/servicios/ServicioReceta";

/** Arma el servicio del Recetario con sus casos de uso. */
export function crearServicioReceta(deps: {
  recetas: IRecetaRepositorio;
  gruposReceta: IGrupoRecetaRepositorio;
  pacientes: IPacienteRepositorio;
  archivos: IArchivoRepositorio;
  almacenamiento: IAlmacenamientoArchivos;
}): ServicioReceta {
  return new ServicioReceta(
    new CrearReceta(deps.recetas),
    new ObtenerRecetas(deps.recetas),
    new ObtenerRecetasPaginado(deps.recetas),
    new ObtenerRecetaPorId(deps.recetas),
    new ActualizarReceta(deps.recetas),
    new EliminarReceta(deps.recetas, deps.archivos, deps.almacenamiento),
    new EliminarArchivoDeReceta(
      deps.recetas,
      deps.archivos,
      deps.almacenamiento,
    ),
    new MarcarFotoPrincipal(deps.recetas),
    new AsignarRecetaAPaciente(deps.recetas, deps.pacientes),
    new DesasignarRecetaDePaciente(deps.recetas),
    new ObtenerRecetasDelPaciente(deps.recetas),
    new ObtenerPacientesDeReceta(deps.recetas),
    new MoverRecetaAGrupo(deps.recetas, deps.gruposReceta),
    new CrearGrupoReceta(deps.gruposReceta),
    new ActualizarGrupoReceta(deps.gruposReceta),
    new EliminarGrupoReceta(deps.gruposReceta),
    new ObtenerGruposReceta(deps.gruposReceta),
  );
}

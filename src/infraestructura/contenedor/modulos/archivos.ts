import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { SubirArchivo } from "@/aplicacion/casos-de-uso/archivos/SubirArchivo";
import { ObtenerUrlArchivo } from "@/aplicacion/casos-de-uso/archivos/ObtenerUrlArchivo";
import { ObtenerContenidoArchivo } from "@/aplicacion/casos-de-uso/archivos/ObtenerContenidoArchivo";
import { EliminarArchivo } from "@/aplicacion/casos-de-uso/archivos/EliminarArchivo";
import { LimpiarArchivosHuerfanos } from "@/aplicacion/casos-de-uso/archivos/LimpiarArchivosHuerfanos";
import { ObtenerArchivosDeDueno } from "@/aplicacion/casos-de-uso/archivos/ObtenerArchivosDeDueno";
import { PuedeVerArchivoPaciente } from "@/aplicacion/casos-de-uso/archivos/PuedeVerArchivoPaciente";
import { ServicioArchivo } from "@/aplicacion/servicios/ServicioArchivo";

/** Arma el servicio de Archivos con sus casos de uso. */
export function crearServicioArchivo(deps: {
  archivos: IArchivoRepositorio;
  recetas: IRecetaRepositorio;
  materiales: IMaterialRepositorio;
  planes: IPlanRepositorio;
  almacenamiento: IAlmacenamientoArchivos;
}): ServicioArchivo {
  return new ServicioArchivo(
    new SubirArchivo(deps.archivos, deps.almacenamiento),
    new ObtenerUrlArchivo(deps.archivos, deps.almacenamiento),
    new ObtenerContenidoArchivo(deps.archivos, deps.almacenamiento),
    new EliminarArchivo(deps.archivos, deps.almacenamiento),
    new LimpiarArchivosHuerfanos(deps.archivos, deps.almacenamiento),
    new ObtenerArchivosDeDueno(deps.archivos),
    new PuedeVerArchivoPaciente(
      deps.archivos,
      deps.recetas,
      deps.materiales,
      deps.planes,
    ),
  );
}

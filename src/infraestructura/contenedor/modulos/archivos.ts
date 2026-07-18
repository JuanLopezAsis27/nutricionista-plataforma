import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { SubirArchivo } from "@/dominio/casos-de-uso/archivos/SubirArchivo";
import { ObtenerUrlArchivo } from "@/dominio/casos-de-uso/archivos/ObtenerUrlArchivo";
import { EliminarArchivo } from "@/dominio/casos-de-uso/archivos/EliminarArchivo";
import { LimpiarArchivosHuerfanos } from "@/dominio/casos-de-uso/archivos/LimpiarArchivosHuerfanos";
import { ObtenerArchivosDeDueno } from "@/dominio/casos-de-uso/archivos/ObtenerArchivosDeDueno";
import { PuedeVerArchivoPaciente } from "@/dominio/casos-de-uso/archivos/PuedeVerArchivoPaciente";
import { ServicioArchivo } from "@/aplicacion/servicios/ServicioArchivo";

/** Arma el servicio de Archivos con sus casos de uso. */
export function crearServicioArchivo(deps: {
  archivos: IArchivoRepositorio;
  recetas: IRecetaRepositorio;
  materiales: IMaterialRepositorio;
  almacenamiento: IAlmacenamientoArchivos;
}): ServicioArchivo {
  return new ServicioArchivo(
    new SubirArchivo(deps.archivos, deps.almacenamiento),
    new ObtenerUrlArchivo(deps.archivos, deps.almacenamiento),
    new EliminarArchivo(deps.archivos, deps.almacenamiento),
    new LimpiarArchivosHuerfanos(deps.archivos, deps.almacenamiento),
    new ObtenerArchivosDeDueno(deps.archivos),
    new PuedeVerArchivoPaciente(deps.archivos, deps.recetas, deps.materiales),
  );
}

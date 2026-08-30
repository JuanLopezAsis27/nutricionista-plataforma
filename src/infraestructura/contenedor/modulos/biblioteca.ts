import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { CrearMaterial } from "@/aplicacion/casos-de-uso/biblioteca/CrearMaterial";
import { ActualizarMaterial } from "@/aplicacion/casos-de-uso/biblioteca/ActualizarMaterial";
import { EliminarMaterial } from "@/aplicacion/casos-de-uso/biblioteca/EliminarMaterial";
import { ObtenerMateriales } from "@/aplicacion/casos-de-uso/biblioteca/ObtenerMateriales";
import { ObtenerMaterialesPaginado } from "@/aplicacion/casos-de-uso/biblioteca/ObtenerMaterialesPaginado";
import { AsignarMaterialAPaciente } from "@/aplicacion/casos-de-uso/biblioteca/AsignarMaterialAPaciente";
import { DesasignarMaterialDePaciente } from "@/aplicacion/casos-de-uso/biblioteca/DesasignarMaterialDePaciente";
import { ObtenerMaterialesDelPaciente } from "@/aplicacion/casos-de-uso/biblioteca/ObtenerMaterialesDelPaciente";
import { ObtenerPacientesDeMaterial } from "@/aplicacion/casos-de-uso/biblioteca/ObtenerPacientesDeMaterial";
import { ServicioBiblioteca } from "@/aplicacion/servicios/ServicioBiblioteca";

/** Arma el servicio de la Biblioteca con sus casos de uso. */
export function crearServicioBiblioteca(deps: {
  materiales: IMaterialRepositorio;
  pacientes: IPacienteRepositorio;
  archivos: IArchivoRepositorio;
  almacenamiento: IAlmacenamientoArchivos;
}): ServicioBiblioteca {
  return new ServicioBiblioteca(
    new CrearMaterial(deps.materiales),
    new ActualizarMaterial(deps.materiales),
    new EliminarMaterial(deps.materiales, deps.archivos, deps.almacenamiento),
    new ObtenerMateriales(deps.materiales),
    new ObtenerMaterialesPaginado(deps.materiales),
    new AsignarMaterialAPaciente(deps.materiales, deps.pacientes),
    new DesasignarMaterialDePaciente(deps.materiales),
    new ObtenerMaterialesDelPaciente(deps.materiales),
    new ObtenerPacientesDeMaterial(deps.materiales),
  );
}

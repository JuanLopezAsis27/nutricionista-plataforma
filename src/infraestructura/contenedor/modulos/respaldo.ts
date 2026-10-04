import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IUbicacionArchivosRepositorio } from "@/dominio/repositorios/IUbicacionArchivosRepositorio";
import { ArmarIndiceRespaldo } from "@/aplicacion/casos-de-uso/respaldo/ArmarIndiceRespaldo";
import { ServicioRespaldo } from "@/aplicacion/servicios/ServicioRespaldo";

/** Arma el servicio del respaldo del consultorio. */
export function crearServicioRespaldo(deps: {
  pacientes: IPacienteRepositorio;
  asignaciones: IAsignacionPlanRepositorio;
  archivos: IUbicacionArchivosRepositorio;
}): ServicioRespaldo {
  return new ServicioRespaldo(
    new ArmarIndiceRespaldo(deps.pacientes, deps.asignaciones, deps.archivos),
  );
}

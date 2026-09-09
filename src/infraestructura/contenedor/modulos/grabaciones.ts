import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { IColaTrabajos } from "@/dominio/servicios/IColaTrabajos";
import type { ITranscriptorAudio } from "@/dominio/servicios/ITranscriptorAudio";
import type { IResumidorConsulta } from "@/dominio/servicios/IResumidorConsulta";
import { RegistrarGrabacion } from "@/aplicacion/casos-de-uso/grabaciones/RegistrarGrabacion";
import { ObtenerGrabacionesDeTurno } from "@/aplicacion/casos-de-uso/grabaciones/ObtenerGrabacionesDeTurno";
import { EliminarGrabacion } from "@/aplicacion/casos-de-uso/grabaciones/EliminarGrabacion";
import { ReintentarTranscripcion } from "@/aplicacion/casos-de-uso/grabaciones/ReintentarTranscripcion";
import { TranscribirGrabacion } from "@/aplicacion/casos-de-uso/grabaciones/TranscribirGrabacion";
import { GenerarResumenConsulta } from "@/aplicacion/casos-de-uso/grabaciones/GenerarResumenConsulta";
import { ServicioGrabaciones } from "@/aplicacion/servicios/ServicioGrabaciones";

/** Arma el servicio de grabaciones de consulta con sus casos de uso. */
export function crearServicioGrabaciones(deps: {
  grabaciones: IGrabacionConsultaRepositorio;
  turnos: ITurnoRepositorio;
  pacientes: IPacienteRepositorio;
  archivos: IArchivoRepositorio;
  almacenamiento: IAlmacenamientoArchivos;
  cola: IColaTrabajos;
  transcriptor: ITranscriptorAudio;
  resumidor: IResumidorConsulta;
}): ServicioGrabaciones {
  return new ServicioGrabaciones(
    new RegistrarGrabacion(
      deps.grabaciones,
      deps.turnos,
      deps.archivos,
      deps.cola,
    ),
    new ObtenerGrabacionesDeTurno(deps.grabaciones, deps.turnos),
    new EliminarGrabacion(deps.grabaciones, deps.archivos, deps.almacenamiento),
    new ReintentarTranscripcion(deps.grabaciones, deps.cola),
    new TranscribirGrabacion(
      deps.grabaciones,
      deps.archivos,
      deps.almacenamiento,
      deps.transcriptor,
    ),
    new GenerarResumenConsulta(
      deps.grabaciones,
      deps.turnos,
      deps.pacientes,
      deps.resumidor,
    ),
    deps.grabaciones,
    deps.transcriptor,
  );
}

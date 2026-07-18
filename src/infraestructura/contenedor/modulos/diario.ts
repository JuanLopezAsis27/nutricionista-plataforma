import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { GuardarDia } from "@/dominio/casos-de-uso/diario/GuardarDia";
import { ObtenerDia } from "@/dominio/casos-de-uso/diario/ObtenerDia";
import { ObtenerCalendarioDiario } from "@/dominio/casos-de-uso/diario/ObtenerCalendarioDiario";
import { ObtenerRegistrosEnRango } from "@/dominio/casos-de-uso/diario/ObtenerRegistrosEnRango";
import { AgregarComidaDiario } from "@/dominio/casos-de-uso/diario/AgregarComidaDiario";
import { EliminarComidaDiario } from "@/dominio/casos-de-uso/diario/EliminarComidaDiario";
import { AgregarActividadDiario } from "@/dominio/casos-de-uso/diario/AgregarActividadDiario";
import { EliminarActividadDiario } from "@/dominio/casos-de-uso/diario/EliminarActividadDiario";
import { AgregarFotoComida } from "@/dominio/casos-de-uso/diario/AgregarFotoComida";
import { ServicioDiario } from "@/aplicacion/servicios/ServicioDiario";

/** Arma el servicio del Diario con sus casos de uso. */
export function crearServicioDiario(deps: {
  registros: IRegistroDiarioRepositorio;
  pacientes: IPacienteRepositorio;
  archivos: IArchivoRepositorio;
  almacenamiento: IAlmacenamientoArchivos;
}): ServicioDiario {
  return new ServicioDiario(
    new GuardarDia(deps.registros, deps.pacientes),
    new ObtenerDia(deps.registros),
    new ObtenerCalendarioDiario(deps.registros),
    new ObtenerRegistrosEnRango(deps.registros, deps.pacientes),
    new AgregarComidaDiario(deps.registros, deps.pacientes),
    new EliminarComidaDiario(deps.registros, deps.archivos, deps.almacenamiento),
    new AgregarActividadDiario(deps.registros, deps.pacientes),
    new EliminarActividadDiario(deps.registros),
    new AgregarFotoComida(deps.registros, deps.archivos, deps.almacenamiento),
  );
}

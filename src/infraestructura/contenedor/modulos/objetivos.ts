import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { CrearObjetivo } from "@/aplicacion/casos-de-uso/objetivos/CrearObjetivo";
import { ActualizarObjetivo } from "@/aplicacion/casos-de-uso/objetivos/ActualizarObjetivo";
import { CambiarEstadoObjetivo } from "@/aplicacion/casos-de-uso/objetivos/CambiarEstadoObjetivo";
import { EliminarObjetivo } from "@/aplicacion/casos-de-uso/objetivos/EliminarObjetivo";
import { ObtenerObjetivosDePaciente } from "@/aplicacion/casos-de-uso/objetivos/ObtenerObjetivosDePaciente";
import { AgregarEstrategia } from "@/aplicacion/casos-de-uso/objetivos/AgregarEstrategia";
import { CambiarEstadoEstrategia } from "@/aplicacion/casos-de-uso/objetivos/CambiarEstadoEstrategia";
import { EliminarEstrategia } from "@/aplicacion/casos-de-uso/objetivos/EliminarEstrategia";
import { ObtenerHistorialObjetivo } from "@/aplicacion/casos-de-uso/objetivos/ObtenerHistorialObjetivo";
import { ServicioObjetivo } from "@/aplicacion/servicios/ServicioObjetivo";

/** Arma el servicio de Objetivos con sus casos de uso. */
export function crearServicioObjetivo(deps: {
  objetivos: IObjetivoRepositorio;
  pacientes: IPacienteRepositorio;
}): ServicioObjetivo {
  return new ServicioObjetivo(
    new CrearObjetivo(deps.objetivos, deps.pacientes),
    new ActualizarObjetivo(deps.objetivos),
    new CambiarEstadoObjetivo(deps.objetivos),
    new EliminarObjetivo(deps.objetivos),
    new ObtenerObjetivosDePaciente(deps.objetivos, deps.pacientes),
    new AgregarEstrategia(deps.objetivos),
    new CambiarEstadoEstrategia(deps.objetivos),
    new EliminarEstrategia(deps.objetivos),
    new ObtenerHistorialObjetivo(deps.objetivos),
  );
}

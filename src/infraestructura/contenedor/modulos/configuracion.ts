import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { ObtenerConfiguracion } from "@/dominio/casos-de-uso/configuracion/ObtenerConfiguracion";
import { GuardarConfiguracion } from "@/dominio/casos-de-uso/configuracion/GuardarConfiguracion";
import { ServicioConfiguracion } from "@/aplicacion/servicios/ServicioConfiguracion";

/** Arma el servicio de Configuración del consultorio. */
export function crearServicioConfiguracion(deps: {
  configuracion: IConfiguracionRepositorio;
}): ServicioConfiguracion {
  return new ServicioConfiguracion(
    new ObtenerConfiguracion(deps.configuracion),
    new GuardarConfiguracion(deps.configuracion),
  );
}

import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import { ServicioCredenciales } from "@/aplicacion/servicios/ServicioCredenciales";

/** Arma el servicio de credenciales de integración del profesional. */
export function crearServicioCredenciales(deps: {
  credenciales: ICredencialesIntegracionRepositorio;
}): ServicioCredenciales {
  return new ServicioCredenciales(deps.credenciales);
}

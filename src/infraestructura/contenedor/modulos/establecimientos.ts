import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import { ListarEstablecimientos } from "@/aplicacion/casos-de-uso/establecimientos/ListarEstablecimientos";
import { ObtenerEstablecimientoVigente } from "@/aplicacion/casos-de-uso/establecimientos/ObtenerEstablecimientoVigente";
import { CrearEstablecimiento } from "@/aplicacion/casos-de-uso/establecimientos/CrearEstablecimiento";
import { ActualizarEstablecimiento } from "@/aplicacion/casos-de-uso/establecimientos/ActualizarEstablecimiento";
import { ArchivarEstablecimiento } from "@/aplicacion/casos-de-uso/establecimientos/ArchivarEstablecimiento";
import { RestaurarEstablecimiento } from "@/aplicacion/casos-de-uso/establecimientos/RestaurarEstablecimiento";
import { FijarEstablecimientoPrincipal } from "@/aplicacion/casos-de-uso/establecimientos/FijarEstablecimientoPrincipal";
import { ServicioEstablecimiento } from "@/aplicacion/servicios/ServicioEstablecimiento";

/** Arma el servicio de Establecimientos con sus casos de uso. */
export function crearServicioEstablecimiento(deps: {
  establecimientos: IEstablecimientoRepositorio;
}): ServicioEstablecimiento {
  return new ServicioEstablecimiento(
    new ListarEstablecimientos(deps.establecimientos),
    new ObtenerEstablecimientoVigente(deps.establecimientos),
    new CrearEstablecimiento(deps.establecimientos),
    new ActualizarEstablecimiento(deps.establecimientos),
    new ArchivarEstablecimiento(deps.establecimientos),
    new RestaurarEstablecimiento(deps.establecimientos),
    new FijarEstablecimientoPrincipal(deps.establecimientos),
  );
}

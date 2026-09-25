import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ObtenerCentroDeNotificaciones } from "@/aplicacion/casos-de-uso/notificaciones/ObtenerCentroDeNotificaciones";
import { MarcarNotificacionVista } from "@/aplicacion/casos-de-uso/notificaciones/MarcarNotificacionVista";
import { ServicioNotificaciones } from "@/aplicacion/servicios/ServicioNotificaciones";

/**
 * Arma el servicio del Centro de Notificaciones: compone los correos fallidos
 * (derivados) con la tabla propia de notificaciones persistidas, que es la
 * única que tiene estado de "visto". Las alertas de seguimiento no entran:
 * viven en el panel del dashboard.
 */
export function crearServicioNotificaciones(deps: {
  emails: IEmailEnviadoRepositorio;
  notificaciones: INotificacionRepositorio;
  reloj: IRelojFecha;
}): ServicioNotificaciones {
  return new ServicioNotificaciones(
    new ObtenerCentroDeNotificaciones(deps.emails, deps.notificaciones),
    new MarcarNotificacionVista(deps.notificaciones, deps.reloj),
  );
}

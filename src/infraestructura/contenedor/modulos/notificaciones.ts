import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ObtenerCentroDeNotificaciones } from "@/aplicacion/casos-de-uso/notificaciones/ObtenerCentroDeNotificaciones";
import { MarcarNotificacionVista } from "@/aplicacion/casos-de-uso/notificaciones/MarcarNotificacionVista";
import { ServicioNotificaciones } from "@/aplicacion/servicios/ServicioNotificaciones";

/**
 * Arma el servicio del Centro de Notificaciones: compone las señales derivadas
 * (alertas de seguimiento, mensajería y correos) con la tabla propia de
 * notificaciones persistidas, que es la única que tiene estado de "visto".
 */
export function crearServicioNotificaciones(deps: {
  alertas: IAlertaSeguimientoRepositorio;
  emails: IEmailEnviadoRepositorio;
  notificaciones: INotificacionRepositorio;
  reloj: IRelojFecha;
}): ServicioNotificaciones {
  return new ServicioNotificaciones(
    new ObtenerCentroDeNotificaciones(
      deps.alertas,
      deps.emails,
      deps.notificaciones,
    ),
    new MarcarNotificacionVista(deps.notificaciones, deps.reloj),
  );
}

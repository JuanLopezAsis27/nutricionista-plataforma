import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";
import type { IMensajeriaRepositorio } from "@/dominio/repositorios/IMensajeriaRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import { ObtenerCentroDeNotificaciones } from "@/dominio/casos-de-uso/notificaciones/ObtenerCentroDeNotificaciones";
import { ServicioNotificaciones } from "@/aplicacion/servicios/ServicioNotificaciones";

/**
 * Arma el servicio del Centro de Notificaciones. No tiene repositorios propios:
 * compone los ya existentes (alertas de seguimiento, mensajería y correos) en
 * un feed unificado de solo lectura.
 */
export function crearServicioNotificaciones(deps: {
  alertas: IAlertaSeguimientoRepositorio;
  mensajeria: IMensajeriaRepositorio;
  emails: IEmailEnviadoRepositorio;
}): ServicioNotificaciones {
  return new ServicioNotificaciones(
    new ObtenerCentroDeNotificaciones(deps.alertas, deps.mensajeria, deps.emails),
  );
}

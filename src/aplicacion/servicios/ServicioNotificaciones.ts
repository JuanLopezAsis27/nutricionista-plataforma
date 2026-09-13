import type { ObtenerCentroDeNotificaciones } from "@/aplicacion/casos-de-uso/notificaciones/ObtenerCentroDeNotificaciones";
import type { MarcarNotificacionVista } from "@/aplicacion/casos-de-uso/notificaciones/MarcarNotificacionVista";
import type {
  CentroNotificacionesDto,
  MarcarNotificacionVistaDto,
} from "../dtos/notificaciones.dto";

/**
 * Servicio de aplicación del Centro de Notificaciones: expone el feed
 * unificado del nutricionista (alertas de seguimiento + mensajes sin leer +
 * avisos de correo + notificaciones persistidas) y el marcado de vistas.
 * El read-model del dominio ya tiene la forma de salida.
 */
export class ServicioNotificaciones {
  constructor(
    private readonly obtenerCentroUC: ObtenerCentroDeNotificaciones,
    private readonly marcarVistaUC: MarcarNotificacionVista,
  ) {}

  obtenerCentro(): Promise<CentroNotificacionesDto> {
    return this.obtenerCentroUC.ejecutar();
  }

  marcarVista(
    datos: MarcarNotificacionVistaDto,
  ): Promise<{ marcadas: number }> {
    return this.marcarVistaUC.ejecutar({ id: datos.id });
  }
}

import type { ObtenerCentroDeNotificaciones } from "@/dominio/casos-de-uso/notificaciones/ObtenerCentroDeNotificaciones";
import type { CentroNotificacionesDto } from "../dtos/notificaciones.dto";

/**
 * Servicio de aplicación del Centro de Notificaciones: expone el feed
 * unificado del nutricionista (alertas de seguimiento + mensajes sin leer +
 * avisos de correo). El read-model del dominio ya tiene la forma de salida.
 */
export class ServicioNotificaciones {
  constructor(private readonly obtenerCentroUC: ObtenerCentroDeNotificaciones) {}

  obtenerCentro(viewerId: string): Promise<CentroNotificacionesDto> {
    return this.obtenerCentroUC.ejecutar(viewerId);
  }
}

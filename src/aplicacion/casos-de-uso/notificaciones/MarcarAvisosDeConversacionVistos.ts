import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { TipoNotificacion } from "@/dominio/entidades/Notificacion";

/** Por cuál de los dos canales se abrió la conversación. */
export type CanalConversacion = "PORTAL" | "WHATSAPP";

/** Qué aviso de la campana corresponde a cada canal. */
const AVISO_DEL_CANAL: Record<CanalConversacion, TipoNotificacion> = {
  PORTAL: "MENSAJE_APP",
  WHATSAPP: "WHATSAPP_ENTRANTE",
};

/**
 * Caso de uso: abrir la conversación de un paciente apaga el aviso de la
 * campana que decía «te escribió», por el camino que sea —la bandeja, la
 * ficha del paciente, la tarjeta del inicio— y no solo tocando la
 * notificación. Si el mensaje ya se leyó, el aviso que lo anuncia no tiene
 * nada más que decir.
 *
 * Solo el aviso de ESE canal: abrir el chat del portal no dice nada de lo que
 * escribió por WhatsApp. Y solo los avisos de mensajes: un pedido de
 * reprogramar o cancelar es un pendiente sobre un turno, que se atiende en la
 * agenda y no se da por visto por abrir un chat.
 *
 * Nunca lanza, como `EmitirNotificacion`: marcar leídos los mensajes ya salió
 * bien, y que falle el aviso no puede convertirlo en un error en pantalla.
 */
export class MarcarAvisosDeConversacionVistos {
  constructor(
    private readonly notificaciones: INotificacionRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(pacienteId: string, canal: CanalConversacion): Promise<void> {
    try {
      await this.notificaciones.marcarVistasDePaciente(
        pacienteId,
        [AVISO_DEL_CANAL[canal]],
        this.reloj.ahora(),
      );
    } catch (error) {
      console.error(
        `[notificaciones] no se pudo apagar el aviso de ${canal} del paciente ${pacienteId}:`,
        error,
      );
    }
  }
}

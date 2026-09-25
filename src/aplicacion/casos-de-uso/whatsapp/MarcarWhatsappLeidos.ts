import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { MarcarAvisosDeConversacionVistos } from "../notificaciones/MarcarAvisosDeConversacionVistos";

/**
 * Caso de uso: el profesional abrió el chat de WhatsApp de un paciente. Los
 * entrantes pasan a leídos —dejan de contar en el sidebar y en la bandeja— y
 * el aviso «escribió por WhatsApp» de la campana se da por visto.
 *
 * Es la contracara de `MarcarLeidos` del chat del portal: hasta la migración
 * 77 WhatsApp no tenía estado de leído, y un mensaje entrante no se veía en
 * ningún contador.
 */
export class MarcarWhatsappLeidos {
  constructor(
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly avisos: MarcarAvisosDeConversacionVistos,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(pacienteId: string): Promise<void> {
    await this.mensajes.marcarLeidos(pacienteId, this.reloj.ahora());
    await this.avisos.ejecutar(pacienteId, "WHATSAPP");
  }
}

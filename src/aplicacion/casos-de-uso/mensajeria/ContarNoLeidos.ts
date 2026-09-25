import type { IMensajeriaRepositorio } from "@/dominio/repositorios/IMensajeriaRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";

/**
 * Caso de uso: contar los mensajes no leídos de `viewerId`.
 * - Con `pacienteId` (portal): solo la conversación de ese paciente, y solo
 *   el chat del portal —el paciente no ve WhatsApp en la app—.
 * - Sin `pacienteId` (nutricionista): el total de todas las conversaciones,
 *   por los DOS canales. Es el número de «Mensajes» del sidebar, y mientras
 *   contaba solo el portal un WhatsApp entrante no se veía ahí.
 */
export class ContarNoLeidos {
  constructor(
    private readonly repositorio: IMensajeriaRepositorio,
    private readonly whatsapp: IMensajeWhatsappRepositorio,
  ) {}

  async ejecutar(viewerId: string, pacienteId?: string): Promise<number> {
    if (pacienteId) {
      const conversacion =
        await this.repositorio.obtenerConversacionPorPaciente(pacienteId);
      if (!conversacion) return 0;
      return this.repositorio.contarNoLeidos(viewerId, conversacion.id);
    }
    const [portal, whatsapp] = await Promise.all([
      this.repositorio.contarNoLeidos(viewerId),
      this.whatsapp.contarNoLeidos(),
    ]);
    return portal + whatsapp;
  }
}

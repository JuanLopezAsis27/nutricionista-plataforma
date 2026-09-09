import type { IMensajeriaRepositorio } from "@/dominio/repositorios/IMensajeriaRepositorio";

/**
 * Caso de uso: marcar como leídos los mensajes que le llegaron a `viewerId`
 * en la conversación del paciente. Si la conversación no existe todavía, no
 * hay nada que marcar.
 */
export class MarcarLeidos {
  constructor(private readonly repositorio: IMensajeriaRepositorio) {}

  async ejecutar(pacienteId: string, viewerId: string): Promise<void> {
    const conversacion =
      await this.repositorio.obtenerConversacionPorPaciente(pacienteId);
    if (!conversacion) return;
    await this.repositorio.marcarLeidos(conversacion.id, viewerId, new Date());
  }
}

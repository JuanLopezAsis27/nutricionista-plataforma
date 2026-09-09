import type { IMensajeriaRepositorio } from "@/dominio/repositorios/IMensajeriaRepositorio";

/**
 * Caso de uso: contar los mensajes no leídos de `viewerId`.
 * - Con `pacienteId` (portal): solo la conversación de ese paciente.
 * - Sin `pacienteId` (nutricionista): el total de todas las conversaciones.
 */
export class ContarNoLeidos {
  constructor(private readonly repositorio: IMensajeriaRepositorio) {}

  async ejecutar(viewerId: string, pacienteId?: string): Promise<number> {
    if (pacienteId) {
      const conversacion =
        await this.repositorio.obtenerConversacionPorPaciente(pacienteId);
      if (!conversacion) return 0;
      return this.repositorio.contarNoLeidos(viewerId, conversacion.id);
    }
    return this.repositorio.contarNoLeidos(viewerId);
  }
}

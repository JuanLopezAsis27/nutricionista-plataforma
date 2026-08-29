import type { IMensajeriaRepositorio } from "../../repositorios/IMensajeriaRepositorio";
import { Conversacion } from "../../entidades/Conversacion";

/**
 * Caso de uso: obtener la conversación de un paciente, creándola si aún no
 * existe (upsert). La usan tanto el portal del paciente como el nutricionista
 * al abrir un hilo.
 */
export class ObtenerConversacionDePaciente {
  constructor(private readonly repositorio: IMensajeriaRepositorio) {}

  async ejecutar(pacienteId: string): Promise<Conversacion> {
    const existente =
      await this.repositorio.obtenerConversacionPorPaciente(pacienteId);
    if (existente) {
      return existente;
    }
    return this.repositorio.crearConversacion(
      Conversacion.crear(pacienteId, crypto.randomUUID()),
    );
  }
}

import type { IMensajeriaRepositorio } from "../../repositorios/IMensajeriaRepositorio";
import type { Mensaje } from "../../entidades/Mensaje";

/** Caso de uso: listar los mensajes de una conversación (orden cronológico). */
export class ListarMensajes {
  constructor(private readonly repositorio: IMensajeriaRepositorio) {}

  async ejecutar(conversacionId: string, limite = 200): Promise<Mensaje[]> {
    return this.repositorio.listarMensajes(conversacionId, limite);
  }
}

import type {
  IMensajeriaRepositorio,
  ResumenConversacion,
} from "../../repositorios/IMensajeriaRepositorio";

/** Caso de uso: listar las conversaciones (vista del nutricionista). */
export class ListarConversaciones {
  constructor(private readonly repositorio: IMensajeriaRepositorio) {}

  async ejecutar(viewerId: string): Promise<ResumenConversacion[]> {
    return this.repositorio.listarResumen(viewerId);
  }
}

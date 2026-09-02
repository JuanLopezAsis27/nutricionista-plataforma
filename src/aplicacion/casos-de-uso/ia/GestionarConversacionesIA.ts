import type {
  IConversacionIARepositorio,
  ResumenConversacionIA,
} from "@/dominio/repositorios/IConversacionIARepositorio";
import type { ConversacionIA } from "@/dominio/entidades/ConversacionIA";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Tope del listado lateral de conversaciones. */
const LIMITE_POR_DEFECTO = 50;

/** Caso de uso: los chats con el asistente, del más reciente al más viejo. */
export class ListarConversacionesIA {
  constructor(private readonly conversaciones: IConversacionIARepositorio) {}

  async ejecutar(
    limite = LIMITE_POR_DEFECTO,
  ): Promise<ResumenConversacionIA[]> {
    return this.conversaciones.listar(limite);
  }
}

/** Caso de uso: abrir un chat guardado con todos sus turnos. */
export class ObtenerConversacionIA {
  constructor(private readonly conversaciones: IConversacionIARepositorio) {}

  async ejecutar(id: string): Promise<ConversacionIA> {
    const conversacion = await this.conversaciones.obtenerPorId(id);
    if (!conversacion) {
      throw new ErrorValidacion("Esa conversación no existe.");
    }
    return conversacion;
  }
}

/** Caso de uso: borrar un chat (se lleva sus turnos, FK en cascada). */
export class EliminarConversacionIA {
  constructor(private readonly conversaciones: IConversacionIARepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const conversacion = await this.conversaciones.obtenerPorId(id);
    if (!conversacion) {
      throw new ErrorValidacion("Esa conversación no existe.");
    }
    await this.conversaciones.eliminar(id);
  }
}

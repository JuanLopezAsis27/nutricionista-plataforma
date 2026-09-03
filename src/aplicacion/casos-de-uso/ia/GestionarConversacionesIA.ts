import type {
  IConversacionIARepositorio,
  ResumenConversacionIA,
} from "@/dominio/repositorios/IConversacionIARepositorio";
import type { ConversacionIA } from "@/dominio/entidades/ConversacionIA";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";

/** Tope del listado lateral de conversaciones. */
const LIMITE_POR_DEFECTO = 50;

/**
 * El dueño de los chats que se están mirando: `null` es el profesional y un id
 * es ese paciente. Va explícito en los tres casos de uso —nunca por defecto—
 * porque es lo único que separa los chats de un paciente de los del
 * consultorio, y un valor omitido se resolvería al más permisivo.
 */
type Dueno = string | null;

/** Caso de uso: los chats con el asistente, del más reciente al más viejo. */
export class ListarConversacionesIA {
  constructor(private readonly conversaciones: IConversacionIARepositorio) {}

  async ejecutar(
    dueno: Dueno,
    limite = LIMITE_POR_DEFECTO,
  ): Promise<ResumenConversacionIA[]> {
    return this.conversaciones.listar(limite, dueno);
  }
}

/** Caso de uso: abrir un chat guardado con todos sus turnos. */
export class ObtenerConversacionIA {
  constructor(private readonly conversaciones: IConversacionIARepositorio) {}

  async ejecutar(id: string, dueno: Dueno): Promise<ConversacionIA> {
    const conversacion = await this.conversaciones.obtenerPorId(id);
    if (!conversacion) {
      throw new ErrorValidacion("Esa conversación no existe.");
    }
    verificarDueno(conversacion, dueno);
    return conversacion;
  }
}

/** Caso de uso: borrar un chat (se lleva sus turnos, FK en cascada). */
export class EliminarConversacionIA {
  constructor(private readonly conversaciones: IConversacionIARepositorio) {}

  async ejecutar(id: string, dueno: Dueno): Promise<void> {
    const conversacion = await this.conversaciones.obtenerPorId(id);
    if (!conversacion) {
      throw new ErrorValidacion("Esa conversación no existe.");
    }
    verificarDueno(conversacion, dueno);
    await this.conversaciones.eliminar(id);
  }
}

/**
 * Que el chat sea de quien lo pide.
 *
 * El repositorio ya acota al inquilino, pero adentro de un consultorio conviven
 * los chats del profesional y los de todos sus pacientes: sin este chequeo, un
 * paciente con el id de otro chat lo abriría entero, y los chats del
 * profesional sobre su práctica están en la misma tabla.
 */
export function verificarDueno(
  conversacion: ConversacionIA,
  dueno: Dueno,
): void {
  if (conversacion.pacienteId !== dueno) {
    throw new ErrorAccesoDenegado("Esa conversación no es tuya.");
  }
}

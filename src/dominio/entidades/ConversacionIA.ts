import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Quién dijo cada turno de la conversación. */
export const ROLES_MENSAJE_IA = ["USUARIO", "ASISTENTE"] as const;
export type RolMensajeIA = (typeof ROLES_MENSAJE_IA)[number];

export interface MensajeIA {
  id: string;
  rol: RolMensajeIA;
  contenido: string;
  creadoEn: Date;
}

export interface PropiedadesConversacionIA {
  id: string;
  /** Paciente dueño del chat; null = chat analítico del profesional. */
  pacienteId: string | null;
  titulo: string;
  /** Del más viejo al más nuevo. */
  mensajes: MensajeIA[];
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Largo máximo del título derivado de la primera pregunta. */
const LARGO_TITULO = 80;

/**
 * Una conversación con el asistente.
 *
 * Existe por dos motivos que van juntos: el asistente **no recordaba nada** —
 * cada pregunta viajaba sola al modelo, así que "¿y de ese paciente qué más?"
 * no tenía a qué referirse— y las consultas **no quedaban registradas** en
 * ningún lado, así que lo hablado ayer se perdía al recargar la pantalla.
 *
 * Guardar los turnos resuelve las dos: son el historial que se puede releer Y
 * el contexto que se le manda al modelo en la próxima pregunta.
 *
 * Hay DOS clases, y `pacienteId` es lo único que las distingue:
 *
 * - **null** → chat analítico del PROFESIONAL sobre su práctica. Es del
 *   consultorio y no de un paciente, porque una consulta analítica puede
 *   cruzar varios.
 * - **con valor** → chat de ESE paciente en su portal, sobre sus propios datos.
 *
 * Son la misma cosa —turnos ordenados que se releen y se mandan como
 * contexto—, así que comparten entidad, tabla y repositorio. Lo que no
 * comparten nunca es la lista: cada uno ve la suya, y eso lo garantizan los
 * casos de uso, que siempre resuelven el dueño antes de leer.
 */
export class ConversacionIA {
  private constructor(private readonly props: PropiedadesConversacionIA) {}

  /**
   * Abre una conversación nueva, titulada con la primera pregunta.
   *
   * `pacienteId` decide de quién es (ver arriba): null la deja del
   * consultorio. Se fija ACÁ y no se puede cambiar después: un chat que
   * cambiara de dueño aparecería en la lista de otro con todo lo dicho.
   */
  static iniciar(
    primeraPregunta: string,
    id: string,
    ahora: Date = new Date(),
    pacienteId: string | null = null,
  ): ConversacionIA {
    const pregunta = primeraPregunta?.trim() ?? "";
    if (pregunta.length === 0) {
      throw new ErrorValidacion("La consulta no puede estar vacía.");
    }
    return new ConversacionIA({
      id,
      pacienteId,
      titulo: titularDesde(pregunta),
      mensajes: [],
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesConversacionIA): ConversacionIA {
    return new ConversacionIA({
      ...props,
      mensajes: [...props.mensajes],
    });
  }

  /** Suma un turno y devuelve una copia (las entidades son inmutables). */
  agregar(
    rol: RolMensajeIA,
    contenido: string,
    id: string,
    ahora: Date = new Date(),
  ): ConversacionIA {
    const texto = contenido?.trim() ?? "";
    if (texto.length === 0) {
      throw new ErrorValidacion("Un mensaje no puede estar vacío.");
    }
    return new ConversacionIA({
      ...this.props,
      mensajes: [
        ...this.props.mensajes,
        { id, rol, contenido: texto, creadoEn: ahora },
      ],
      actualizadoEn: ahora,
    });
  }

  /**
   * Los últimos `cantidad` turnos, que es lo que se le manda al modelo.
   *
   * Se recorta a propósito: una conversación larga entra entera en cada
   * request y se paga por token en cada pregunta. Los turnos viejos importan
   * mucho menos que los últimos, y el corte es por CANTIDAD y no por tokens
   * porque no hay contador acá y un número redondo es más predecible para
   * quien mira la factura.
   */
  ultimosTurnos(cantidad: number): MensajeIA[] {
    return this.props.mensajes.slice(-cantidad);
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string | null {
    return this.props.pacienteId;
  }
  get titulo(): string {
    return this.props.titulo;
  }
  get mensajes(): MensajeIA[] {
    return [...this.props.mensajes];
  }
  get actualizadoEn(): Date {
    return this.props.actualizadoEn;
  }

  aPrimitivos(): PropiedadesConversacionIA {
    return { ...this.props, mensajes: [...this.props.mensajes] };
  }
}

/**
 * Título a partir de la primera pregunta, cortado en un espacio.
 *
 * Cortar al carácter exacto parte una palabra al medio, y la lista de
 * conversaciones es justamente donde el profesional tiene que reconocer de qué
 * era cada una de un vistazo.
 */
function titularDesde(pregunta: string): string {
  const limpio = pregunta.replace(/\s+/g, " ").trim();
  if (limpio.length <= LARGO_TITULO) return limpio;
  const corte = limpio.slice(0, LARGO_TITULO);
  const ultimoEspacio = corte.lastIndexOf(" ");
  return `${ultimoEspacio > 40 ? corte.slice(0, ultimoEspacio) : corte}…`;
}

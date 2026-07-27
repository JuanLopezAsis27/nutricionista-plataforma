import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Estado completo de una conversación persistida. */
export interface PropiedadesConversacion {
  id: string;
  pacienteId: string;
  ultimoMensajeTexto: string | null;
  ultimoMensajeEn: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio Conversacion: el hilo entre el nutricionista y un
 * paciente (una por paciente). Guarda denormalizado el último mensaje para
 * listar las conversaciones sin traer todos los mensajes.
 */
export class Conversacion {
  private constructor(private readonly props: PropiedadesConversacion) {}

  static crear(pacienteId: string, id: string, ahora: Date = new Date()): Conversacion {
    if (!pacienteId) {
      throw new ErrorValidacion("La conversación debe pertenecer a un paciente.");
    }
    return new Conversacion({
      id,
      pacienteId,
      ultimoMensajeTexto: null,
      ultimoMensajeEn: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesConversacion): Conversacion {
    return new Conversacion(props);
  }

  /** Actualiza el resumen del último mensaje (recortado para el listado). */
  registrarUltimoMensaje(texto: string, cuando: Date): void {
    this.props.ultimoMensajeTexto = texto.length > 120 ? `${texto.slice(0, 117)}…` : texto;
    this.props.ultimoMensajeEn = cuando;
    this.props.actualizadoEn = cuando;
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }

  aPrimitivos(): PropiedadesConversacion {
    return { ...this.props };
  }
}

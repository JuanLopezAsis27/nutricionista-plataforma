import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos para crear un mensaje nuevo. */
export interface DatosNuevoMensaje {
  conversacionId: string;
  autorId: string;
  cuerpo: string;
}

/** Estado completo de un mensaje persistido. */
export interface PropiedadesMensaje {
  id: string;
  conversacionId: string;
  autorId: string;
  cuerpo: string;
  leidoEn: Date | null;
  creadoEn: Date;
}

const LARGO_MAXIMO = 4000;

/**
 * Entidad de dominio Mensaje: una línea de la conversación entre el
 * nutricionista y un paciente. `autorId` es el Usuario.id que lo escribió;
 * `leidoEn` null significa no leído por el destinatario.
 */
export class Mensaje {
  private constructor(private readonly props: PropiedadesMensaje) {}

  static crear(datos: DatosNuevoMensaje, id: string, ahora: Date = new Date()): Mensaje {
    const cuerpo = datos.cuerpo?.trim() ?? "";
    if (cuerpo.length === 0) {
      throw new ErrorValidacion("El mensaje no puede estar vacío.");
    }
    if (cuerpo.length > LARGO_MAXIMO) {
      throw new ErrorValidacion(`El mensaje no puede superar ${LARGO_MAXIMO} caracteres.`);
    }
    if (!datos.conversacionId || !datos.autorId) {
      throw new ErrorValidacion("El mensaje debe tener conversación y autor.");
    }

    return new Mensaje({
      id,
      conversacionId: datos.conversacionId,
      autorId: datos.autorId,
      cuerpo,
      leidoEn: null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesMensaje): Mensaje {
    return new Mensaje(props);
  }

  get id(): string {
    return this.props.id;
  }
  get conversacionId(): string {
    return this.props.conversacionId;
  }
  get autorId(): string {
    return this.props.autorId;
  }
  get cuerpo(): string {
    return this.props.cuerpo;
  }

  aPrimitivos(): PropiedadesMensaje {
    return { ...this.props };
  }
}

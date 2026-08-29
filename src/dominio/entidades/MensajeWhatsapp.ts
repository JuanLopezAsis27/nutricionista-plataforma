import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Sentido del mensaje respecto del consultorio. */
export const DIRECCIONES_WHATSAPP = ["ENTRANTE", "SALIENTE"] as const;
export type DireccionWhatsapp = (typeof DIRECCIONES_WHATSAPP)[number];

/** Estados de entrega que informa la Cloud API por webhook. */
export const ESTADOS_MENSAJE_WHATSAPP = [
  "PENDIENTE",
  "ENVIADO",
  "ENTREGADO",
  "LEIDO",
  "FALLIDO",
] as const;
export type EstadoMensajeWhatsapp = (typeof ESTADOS_MENSAJE_WHATSAPP)[number];

/** Orden de avance: un estado nunca retrocede (los webhooks llegan desordenados). */
const ORDEN: Record<EstadoMensajeWhatsapp, number> = {
  PENDIENTE: 0,
  ENVIADO: 1,
  ENTREGADO: 2,
  LEIDO: 3,
  FALLIDO: 4,
};

/** Datos para registrar un mensaje de WhatsApp. */
export interface DatosMensajeWhatsapp {
  pacienteId: string;
  direccion: DireccionWhatsapp;
  telefono: string;
  cuerpo: string;
  idExterno?: string | null;
  estado?: EstadoMensajeWhatsapp;
}

/** Estado completo de un mensaje persistido. */
export interface PropiedadesMensajeWhatsapp {
  id: string;
  pacienteId: string;
  direccion: DireccionWhatsapp;
  telefono: string;
  cuerpo: string;
  idExterno: string | null;
  estado: EstadoMensajeWhatsapp;
  error: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

const LARGO_MAXIMO = 4096; // límite de un mensaje de texto en la Cloud API

/**
 * Entidad de dominio MensajeWhatsapp: una línea del hilo de WhatsApp con un
 * paciente.
 *
 * Solo existe para pacientes del inquilino: los mensajes de cualquier otro
 * número se descartan antes de llegar acá (el WhatsApp personal del
 * profesional no entra a la app).
 */
export class MensajeWhatsapp {
  private constructor(private readonly props: PropiedadesMensajeWhatsapp) {}

  static crear(
    datos: DatosMensajeWhatsapp,
    id: string,
    ahora: Date = new Date(),
  ): MensajeWhatsapp {
    const cuerpo = datos.cuerpo?.trim() ?? "";
    if (cuerpo.length === 0) {
      throw new ErrorValidacion("El mensaje no puede estar vacío.");
    }
    if (cuerpo.length > LARGO_MAXIMO) {
      throw new ErrorValidacion(
        `El mensaje no puede superar ${LARGO_MAXIMO} caracteres.`,
      );
    }
    if (!datos.pacienteId) {
      throw new ErrorValidacion("El mensaje debe pertenecer a un paciente.");
    }

    return new MensajeWhatsapp({
      id,
      pacienteId: datos.pacienteId,
      direccion: datos.direccion,
      telefono: datos.telefono,
      cuerpo,
      idExterno: datos.idExterno ?? null,
      estado:
        datos.estado ??
        (datos.direccion === "ENTRANTE" ? "ENTREGADO" : "PENDIENTE"),
      error: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesMensajeWhatsapp): MensajeWhatsapp {
    return new MensajeWhatsapp(props);
  }

  /**
   * Avanza el estado de entrega. Los webhooks de Meta pueden llegar
   * desordenados (`delivered` después de `read`), así que un estado nunca
   * retrocede.
   */
  registrarEstado(
    estado: EstadoMensajeWhatsapp,
    ahora: Date = new Date(),
  ): MensajeWhatsapp {
    if (ORDEN[estado] <= ORDEN[this.props.estado]) {
      return this;
    }
    return new MensajeWhatsapp({ ...this.props, estado, actualizadoEn: ahora });
  }

  /** Marca el mensaje como fallido con el motivo que informó el proveedor. */
  registrarFallo(motivo: string, ahora: Date = new Date()): MensajeWhatsapp {
    return new MensajeWhatsapp({
      ...this.props,
      estado: "FALLIDO",
      error: motivo,
      actualizadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get direccion(): DireccionWhatsapp {
    return this.props.direccion;
  }
  get cuerpo(): string {
    return this.props.cuerpo;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesMensajeWhatsapp {
    return { ...this.props };
  }
}

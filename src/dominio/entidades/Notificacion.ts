import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Qué originó la notificación.
 *
 * Como `MetodoGrasa`, los valores solo se AGREGAN: una notificación ya guardada
 * no puede cambiar de tipo porque alguien renombró una constante.
 */
export const TIPOS_NOTIFICACION = [
  "WHATSAPP_ENTRANTE",
  "TURNO_CONFIRMADO",
  "MENSAJE_APP",
  /** Tocó «reprogramar» en un botón de la plantilla de WhatsApp. */
  "REPROGRAMACION_PEDIDA",
  /** Canceló su turno desde el enlace del recordatorio (el turno ya está cancelado). */
  "TURNO_CANCELADO",
  /** Tocó «cancelar» en una respuesta rápida de WhatsApp (el turno NO se tocó). */
  "CANCELACION_PEDIDA",
] as const;

export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

/** Datos para emitir una notificación. */
export interface DatosNuevaNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  pacienteId: string | null;
  enlace: string | null;
}

/** Estado completo de una notificación persistida. */
export interface PropiedadesNotificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  pacienteId: string | null;
  enlace: string | null;
  vistoEn: Date | null;
  creadoEn: Date;
}

/**
 * Entidad de dominio Notificacion: un aviso para el nutricionista sobre algo
 * que hizo el paciente, con estado de "visto".
 *
 * ## Por qué es una entidad propia y no una alerta de seguimiento
 *
 * `AlertaSeguimiento` describe la ADHERENCIA del paciente (no registró el peso,
 * el plan venció) y la produce un barrido que puede volver a generarla: por eso
 * se "resuelve" o se "descarta". Una notificación es un HECHO que ya ocurrió
 * —el paciente escribió, el paciente confirmó— y que no se recalcula: solo se
 * ve o no se ve. Son dos ciclos de vida distintos y meterlos en la misma tabla
 * habría obligado al barrido a aprender a no tocar la mitad de sus filas.
 *
 * ## Por qué el título y el detalle vienen escritos
 *
 * El texto se arma al CREARLA y se guarda, en vez de derivarse al leer. Es lo
 * contrario de lo que hace la antropometría —donde nada derivado se persiste—
 * y es deliberado: una notificación cuenta algo que pasó en un momento dado. Si
 * el texto se recalculara, un paciente que después cambia de nombre reescribiría
 * el aviso de hace tres meses, y un turno borrado dejaría el aviso sin nada que
 * decir. Lo que se congela es el relato del hecho, no un cálculo clínico.
 */
export class Notificacion {
  private constructor(private readonly props: PropiedadesNotificacion) {}

  static crear(
    datos: DatosNuevaNotificacion,
    id: string,
    ahora: Date = new Date(),
  ): Notificacion {
    if (!datos.titulo.trim()) {
      throw new ErrorValidacion("La notificación debe tener un título.");
    }
    if (!datos.detalle.trim()) {
      throw new ErrorValidacion("La notificación debe tener un detalle.");
    }
    return new Notificacion({
      id,
      tipo: datos.tipo,
      titulo: datos.titulo.trim(),
      detalle: datos.detalle.trim(),
      pacienteId: datos.pacienteId,
      enlace: datos.enlace,
      vistoEn: null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesNotificacion): Notificacion {
    return new Notificacion(props);
  }

  get estaVista(): boolean {
    return this.props.vistoEn !== null;
  }

  /**
   * Marcarla vista es idempotente: si ya lo estaba, conserva la fecha original.
   * Pisarla haría que "visto hace un mes" se volviera "visto recién" cada vez
   * que se abre la campana.
   */
  marcarVista(ahora: Date = new Date()): Notificacion {
    if (this.props.vistoEn !== null) return this;
    return new Notificacion({ ...this.props, vistoEn: ahora });
  }

  /**
   * Actualiza el aviso PENDIENTE con un hecho nuevo del mismo tipo, en vez de
   * abrir otra fila.
   *
   * Es lo que evita que un paciente que escribe cinco mensajes seguidos deje
   * cinco avisos idénticos en la campana. La lista vuelve a decir lo que decía
   * cuando esto se derivaba de las conversaciones sin leer: una línea por
   * paciente, con lo último que escribió.
   *
   * Solo tiene sentido mientras NO se vio: una vez visto, el aviso es historia
   * y pisarlo borraría el registro de que ya se atendió. Por eso, si ya está
   * visto, devuelve la misma instancia y el llamador emite uno nuevo.
   */
  refrescar(detalle: string, ahora: Date = new Date()): Notificacion {
    if (this.props.vistoEn !== null) return this;
    return new Notificacion({
      ...this.props,
      detalle: detalle.trim() || this.props.detalle,
      creadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get tipo(): TipoNotificacion {
    return this.props.tipo;
  }
  get titulo(): string {
    return this.props.titulo;
  }
  get detalle(): string {
    return this.props.detalle;
  }
  get pacienteId(): string | null {
    return this.props.pacienteId;
  }
  get enlace(): string | null {
    return this.props.enlace;
  }
  get vistoEn(): Date | null {
    return this.props.vistoEn;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesNotificacion {
    return { ...this.props };
  }
}

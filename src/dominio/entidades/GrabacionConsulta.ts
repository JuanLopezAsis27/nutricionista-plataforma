import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Estado del procesamiento de una grabación.
 *
 * Describe SOLO la transcripción. El resumen es del turno entero
 * (`ResumenConsulta`): mezclarlos dejaría una grabación «a medias» porque el
 * resumen de otra falló.
 */
export const ESTADOS_GRABACION = [
  "PENDIENTE",
  "TRANSCRIBIENDO",
  "LISTA",
  "FALLIDA",
] as const;
export type EstadoGrabacion = (typeof ESTADOS_GRABACION)[number];

/**
 * Cuántas veces se reintenta transcribir antes de dejarla fallida.
 *
 * Bajo a propósito: los fallos de un proveedor de voz a texto se parten en dos
 * —el hipo de red, que se arregla solo, y el audio que el proveedor no acepta,
 * que no se arregla nunca—. Insistir mucho no distingue entre los dos y encima
 * cuesta plata; el reintento a mano queda disponible en la pantalla.
 */
export const MAX_INTENTOS_TRANSCRIPCION = 3;

/** Datos para registrar una grabación recién subida. */
export interface DatosNuevaGrabacion {
  turnoId: string;
  /** Posición dentro del turno (1, 2, 3…). */
  orden: number;
  duracionSegundos?: number | null;
}

/** Estado completo de una grabación persistida. */
export interface PropiedadesGrabacion {
  id: string;
  turnoId: string;
  orden: number;
  duracionSegundos: number | null;
  estado: EstadoGrabacion;
  transcripcion: string | null;
  error: string | null;
  intentos: number;
  transcritoEn: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
  /**
   * Archivo de audio en el bucket. Es opcional porque la grabación se crea en
   * la misma operación en que se vincula el archivo, y entre las dos cosas
   * existe una fila sin audio.
   */
  archivoId: string | null;
  /** Nombre original del audio, para poder ofrecerlo con un nombre humano. */
  nombreArchivo: string | null;
  mimeType: string | null;
  tamanoBytes: number | null;
}

/**
 * Entidad de dominio GrabacionConsulta: el audio de un tramo de la consulta,
 * con su transcripción.
 *
 * Hay MUCHAS por turno a propósito: una consulta se interrumpe —entra alguien,
 * suena el teléfono, se corta para pesar— y obligar a una sola grabación
 * significaba perder lo grabado o dejar el micrófono abierto en el medio.
 *
 * La transcripción se guarda ENTERA, no solo el resumen: un resumen sin su
 * fuente no se puede auditar, y lo que se dice en una consulta es información
 * clínica. El resumen es una lectura de esto, no su reemplazo.
 *
 * Las transiciones de estado están acá y no en el repositorio para que el
 * trabajo del worker no pueda, por ejemplo, marcar LISTA una grabación sin
 * texto: `marcarTranscrita` exige el texto y lo valida.
 */
export class GrabacionConsulta {
  private constructor(private readonly props: PropiedadesGrabacion) {}

  static crear(
    datos: DatosNuevaGrabacion,
    id: string,
    ahora: Date = new Date(),
  ): GrabacionConsulta {
    if (!Number.isInteger(datos.orden) || datos.orden <= 0) {
      throw new ErrorValidacion(
        "El orden de la grabación debe ser un entero positivo.",
      );
    }
    const duracion = datos.duracionSegundos ?? null;
    if (duracion != null && (!Number.isFinite(duracion) || duracion < 0)) {
      throw new ErrorValidacion("La duración de la grabación no es válida.");
    }

    return new GrabacionConsulta({
      id,
      turnoId: datos.turnoId,
      orden: datos.orden,
      duracionSegundos: duracion == null ? null : Math.round(duracion),
      estado: "PENDIENTE",
      transcripcion: null,
      error: null,
      intentos: 0,
      transcritoEn: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
      archivoId: null,
      nombreArchivo: null,
      mimeType: null,
      tamanoBytes: null,
    });
  }

  static reconstruir(props: PropiedadesGrabacion): GrabacionConsulta {
    return new GrabacionConsulta(props);
  }

  /** Toma el trabajo: suma el intento ANTES de llamar al proveedor. */
  marcarEnCurso(ahora: Date = new Date()): GrabacionConsulta {
    return new GrabacionConsulta({
      ...this.props,
      estado: "TRANSCRIBIENDO",
      // El intento se cuenta al empezar, no al fallar: si el proceso muere en
      // el medio, la grabación no vuelve a la cola para siempre.
      intentos: this.props.intentos + 1,
      error: null,
      actualizadoEn: ahora,
    });
  }

  marcarTranscrita(texto: string, ahora: Date = new Date()): GrabacionConsulta {
    const limpio = texto.trim();
    if (limpio.length === 0) {
      // Un audio sin voz devuelve cadena vacía y eso NO es una transcripción
      // lista: dejarla pasar generaría un resumen de la nada.
      throw new ErrorValidacion(
        "La transcripción vino vacía: el audio no tiene voz reconocible.",
      );
    }
    return new GrabacionConsulta({
      ...this.props,
      estado: "LISTA",
      transcripcion: limpio,
      error: null,
      transcritoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  /**
   * Anota el fallo. Vuelve a PENDIENTE mientras queden intentos, para que el
   * barrido la retome; agotados, queda FALLIDA con el motivo a la vista.
   */
  marcarFallida(motivo: string, ahora: Date = new Date()): GrabacionConsulta {
    const quedanIntentos = this.props.intentos < MAX_INTENTOS_TRANSCRIPCION;
    return new GrabacionConsulta({
      ...this.props,
      estado: quedanIntentos ? "PENDIENTE" : "FALLIDA",
      error: motivo.trim().slice(0, 500) || "Error desconocido.",
      actualizadoEn: ahora,
    });
  }

  /** Reintento pedido a mano: limpia el contador y la vuelve a la cola. */
  reintentar(ahora: Date = new Date()): GrabacionConsulta {
    return new GrabacionConsulta({
      ...this.props,
      estado: "PENDIENTE",
      intentos: 0,
      error: null,
      actualizadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get turnoId(): string {
    return this.props.turnoId;
  }
  get orden(): number {
    return this.props.orden;
  }
  get estado(): EstadoGrabacion {
    return this.props.estado;
  }
  get transcripcion(): string | null {
    return this.props.transcripcion;
  }
  get archivoId(): string | null {
    return this.props.archivoId;
  }
  /** ¿Se le puede pedir otro intento sin que sea un pedido a mano? */
  get puedeReintentarseSola(): boolean {
    return this.props.intentos < MAX_INTENTOS_TRANSCRIPCION;
  }

  aPrimitivos(): PropiedadesGrabacion {
    return { ...this.props };
  }
}

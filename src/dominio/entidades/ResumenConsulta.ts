import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Estado completo de un resumen persistido. */
export interface PropiedadesResumenConsulta {
  id: string;
  turnoId: string;
  texto: string;
  /** Modelo que lo generó; null en los resúmenes de demostración. */
  modelo: string | null;
  /** Cuántas transcripciones había cuando se generó. */
  grabacionesIncluidas: number;
  generadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio ResumenConsulta: la lectura que la IA hace de lo que se
 * habló en la consulta.
 *
 * Es UNO por turno y no uno por grabación: lo que se resume es la CONSULTA, y
 * las grabaciones son los pedazos en que quedó partida. Un resumen por pedazo
 * obligaría al profesional a leer tres textos y reconstruir la consulta él.
 *
 * `grabacionesIncluidas` es la razón de que exista esta entidad y no un par de
 * columnas en el turno: es lo que deja decir «este resumen es viejo» sin
 * comparar textos. Si después de generarlo aparece otra grabación, la pantalla
 * lo marca desactualizado y ofrece regenerarlo, en vez de mostrar en silencio
 * un resumen al que le falta la mitad de la consulta.
 *
 * **No reemplaza a la transcripción ni a las notas del turno.** Es material
 * generado por un modelo sobre audio transcrito por otro: los dos pasos pueden
 * equivocarse, y la fuente queda guardada entera justamente para poder
 * comprobarlo.
 */
export class ResumenConsulta {
  private constructor(private readonly props: PropiedadesResumenConsulta) {}

  static crear(
    datos: {
      turnoId: string;
      texto: string;
      modelo?: string | null;
      grabacionesIncluidas: number;
    },
    id: string,
    ahora: Date = new Date(),
  ): ResumenConsulta {
    const texto = datos.texto?.trim() ?? "";
    if (texto.length === 0) {
      throw new ErrorValidacion("El resumen vino vacío.");
    }
    if (
      !Number.isInteger(datos.grabacionesIncluidas) ||
      datos.grabacionesIncluidas <= 0
    ) {
      // Un resumen de cero grabaciones no es un resumen: es una alucinación
      // con fecha. Si no hay transcripciones, no se genera nada.
      throw new ErrorValidacion(
        "El resumen tiene que cubrir al menos una grabación.",
      );
    }
    return new ResumenConsulta({
      id,
      turnoId: datos.turnoId,
      texto,
      modelo: datos.modelo ?? null,
      grabacionesIncluidas: datos.grabacionesIncluidas,
      generadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesResumenConsulta): ResumenConsulta {
    return new ResumenConsulta(props);
  }

  /**
   * ¿Le falta alguna grabación transcrita después de haberse generado?
   *
   * Se compara contra el total de transcripciones LISTAS, no contra el total de
   * grabaciones: una que todavía se está transcribiendo no vuelve viejo al
   * resumen, solo lo va a volver cuando termine.
   */
  estaDesactualizado(transcripcionesListas: number): boolean {
    return transcripcionesListas > this.props.grabacionesIncluidas;
  }

  get id(): string {
    return this.props.id;
  }
  get turnoId(): string {
    return this.props.turnoId;
  }
  get texto(): string {
    return this.props.texto;
  }

  aPrimitivos(): PropiedadesResumenConsulta {
    return { ...this.props };
  }
}

import type { CamposHistoriaClinica } from "../entidades/HistoriaClinica";
import type {
  CamposEvolucion,
  CampoPersonalizadoEvolucion,
} from "../entidades/Evolucion";

/**
 * Una evolución de control leída del documento.
 *
 * Un documento de seguimiento trae VARIAS, una por consulta y cada una con su
 * fecha: es el cuaderno del profesional, no una foto de un día.
 */
export interface EvolucionSugerida extends Partial<CamposEvolucion> {
  /** ISO `YYYY-MM-DD`. Null si el documento no fecha ese bloque. */
  fecha: string | null;
  camposPersonalizados: CampoPersonalizadoEvolucion[];
}

/** Un campo de evolución del consultorio, tal como se le describe a la IA. */
export interface CampoEvolucionPedido {
  clave: string;
  etiqueta: string;
  descripcion: string | null;
}

/** Todo lo que se pudo leer del documento, para PRECARGAR (nada persistido). */
export interface LecturaHistoriaClinica {
  /** Los campos fijos de la historia clínica. */
  campos: Partial<CamposHistoriaClinica>;
  /**
   * Las evoluciones de control que el documento traiga, ordenadas por fecha.
   *
   * Un documento de historia clínica y un cuaderno de evoluciones son muchas
   * veces el MISMO archivo: la ficha adelante y el seguimiento consulta a
   * consulta atrás. Leer las dos cosas de una pasada evita subir el mismo
   * documento dos veces, y es lo que hace que cargar el seguimiento de un
   * paciente nuevo no sea tipear veinte bloques a mano.
   */
  evoluciones: EvolucionSugerida[];
}

/**
 * Puerto que interpreta una foto/documento de historia clínica con IA y
 * devuelve lo que pudo reconocer, para PRECARGAR los formularios. El
 * profesional revisa y guarda: esto no persiste nada por sí mismo.
 */
export interface IInterpretadorHistoriaClinica {
  interpretar(
    archivo: { clave: string; mimeType: string },
    camposEvolucion: CampoEvolucionPedido[],
  ): Promise<LecturaHistoriaClinica>;
}

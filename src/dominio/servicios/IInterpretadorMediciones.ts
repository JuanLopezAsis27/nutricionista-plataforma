import type { MedidasAntropometricas } from "../entidades/Antropometria";

/**
 * Una medición leída de la planilla. Solo el peso es obligatorio: es lo único
 * que la entidad `Antropometria` exige, y una columna sin peso no se puede
 * registrar por más pliegues que traiga.
 */
export interface MedicionSugerida extends Partial<
  Omit<MedidasAntropometricas, "pesoKg">
> {
  pesoKg: number;
  /** ISO `YYYY-MM-DD`. Null si la planilla no fecha esa columna. */
  fecha: string | null;
  /** Lo que la planilla anote por escrito para esa consulta. */
  observaciones: string | null;
}

/** Todo lo que se pudo leer de la planilla, listo para revisar e importar. */
export interface MedicionesSugeridas {
  /**
   * Nombre del paciente tal como figura en la planilla, si lo trae.
   *
   * No se usa para buscar a nadie: se muestra para que el profesional vea
   * contra qué ficha está importando. Una planilla de otra persona cargada en
   * la ficha equivocada es un error clínico que nada más detecta.
   */
  nombreEnPlanilla: string | null;
  /** Ordenadas por fecha ascendente, como las columnas de la planilla. */
  mediciones: MedicionSugerida[];
}

/**
 * Puerto que lee una planilla de evolución (Excel, PDF o foto) con IA y
 * devuelve LAS MEDICIONES que reconoció, una por consulta.
 *
 * Es plural a propósito y ahí está toda la diferencia con
 * `IInterpretadorFichaPaciente`, que lee UNA medición inicial de una ficha de
 * alta: la planilla de seguimiento del profesional tiene una columna por fecha
 * y lo que se importa es la serie histórica completa.
 *
 * No persiste nada: lo que salga de acá se muestra para revisar y el
 * profesional decide qué importar.
 */
export interface IInterpretadorMediciones {
  interpretar(archivo: {
    clave: string;
    mimeType: string;
  }): Promise<MedicionesSugeridas>;
}

/** Datos de una corrección del profesional sobre un insight. */
export interface DatosRetroalimentacion {
  pacienteId: string;
  tipoInsight: string;
  /** true = el insight fue útil/acertado (👍); false = no (👎). */
  util: boolean;
  /** Texto del insight al momento del voto (contexto de la etiqueta). */
  detalle: string;
  comentario?: string | null;
}

/**
 * Contrato de persistencia de la retroalimentación de insights. Es la etiqueta
 * del loop de feedback (la lee el ml-servicio para entrenar a futuro).
 */
export interface IRetroalimentacionInsightRepositorio {
  /**
   * Registra (o reemplaza) el voto del profesional para un paciente + tipo de
   * insight. Idempotente por (inquilino, paciente, tipo): el último voto gana.
   */
  registrar(datos: DatosRetroalimentacion): Promise<void>;
}

/** Un tramo de la consulta, ya transcrito. */
export interface TramoConsulta {
  orden: number;
  texto: string;
}

/** Con qué se generó un resumen (para poder leerlo sabiendo de dónde sale). */
export interface ResumenGenerado {
  texto: string;
  /** Modelo usado, o null si lo produjo el stub de demostración. */
  modelo: string | null;
}

/**
 * Puerto del resumidor de consultas.
 *
 * Es un puerto propio y no una llamada suelta al LLM porque el prompt es la
 * parte delicada de esta función: lo que se le pide al modelo decide si el
 * resumen sirve como registro clínico o es un texto lindo que inventa datos.
 * Teniéndolo detrás de un puerto, cambiar de proveedor no reescribe el prompt
 * y el caso de uso se testea sin red.
 */
export interface IResumidorConsulta {
  resumir(
    tramos: TramoConsulta[],
    contexto: { nombrePaciente?: string | null; fecha?: Date | null },
  ): Promise<ResumenGenerado>;
}

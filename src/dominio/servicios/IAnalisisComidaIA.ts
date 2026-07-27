/** Resultado del análisis de una foto de comida (macros estimados). */
export interface ResultadoAnalisisComida {
  descripcion: string;
  porcionEstimada: string;
  calorias: number;
  proteinasG: number;
  carbohidratosG: number;
  grasasG: number;
  /** Confianza del análisis (0..1). */
  confianza: number;
  /** Nota aclaratoria (ej. que hoy es una demostración). */
  nota: string;
}

/**
 * Puerto de análisis de fotos de comida con IA. La implementación actual es
 * un stub de demostración; a futuro, un adaptador de visión (Claude) que
 * recibe la imagen del bucket y devuelve porción y macros estimados.
 */
export interface IAnalisisComidaIA {
  analizar(entrada: { archivoClave?: string; descripcion?: string }): Promise<ResultadoAnalisisComida>;
}

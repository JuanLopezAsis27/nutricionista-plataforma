import type {
  IAnalisisComidaIA,
  ResultadoAnalisisComida,
} from "@/dominio/servicios/IAnalisisComidaIA";

/**
 * Adaptador STUB del análisis de comida. Devuelve macros de ejemplo con baja
 * confianza y una nota de demostración. A futuro se reemplaza por un adaptador
 * de visión (Claude) que recibe la imagen y estima porción y macros reales.
 */
export class AnalisisComidaIAStub implements IAnalisisComidaIA {
  async analizar(entrada: {
    archivoClave?: string;
    descripcion?: string;
  }): Promise<ResultadoAnalisisComida> {
    return {
      descripcion: entrada.descripcion?.trim() || "Plato con proteína, guarnición y vegetales",
      porcionEstimada: "1 plato (~350 g)",
      calorias: 520,
      proteinasG: 32,
      carbohidratosG: 45,
      grasasG: 22,
      confianza: 0.4,
      nota: "Resultado de demostración. El análisis con IA se implementará próximamente.",
    };
  }
}

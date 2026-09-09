import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { ProtocoloComposicion } from "@/dominio/entidades/Antropometria";
import type { ResultadoGrasa } from "@/dominio/servicios/grasaPorPliegues";

/**
 * Vive en `aplicacion` (no en `componentes`) por la misma razón que
 * `filasMedicion.ts`: lo lee también el PDF de la medición, en
 * infraestructura, que no puede importar de la presentación.
 */

/** Nombre corto del protocolo, para las cabeceras de la pestaña. */
export const ETIQUETAS_PROTOCOLO: Record<ProtocoloComposicion, string> = {
  DOS_COMPONENTES: "2 componentes",
  CINCO_COMPONENTES: "5 componentes (Kerr)",
};

/**
 * Ecuación de grasa que manda en una medición: la que el profesional destacó
 * o, si no destacó ninguna, la primera que las medidas hayan resuelto.
 *
 * Es la misma regla que aplica el dashboard, y está acá para que la tarjeta de
 * la medición muestre el MISMO porcentaje que su ficha. Que dos vistas de la
 * misma consulta elijan ecuaciones distintas es exactamente el error que la
 * regla dura del módulo prohíbe: los valores de dos ecuaciones no se comparan
 * entre sí.
 */
export function grasaDestacada(
  medicion: MedicionComposicionDto,
): ResultadoGrasa | undefined {
  const { resultados } = medicion.resultado.grasaPorPliegues;
  return (
    resultados.find((r) => r.metodo === medicion.metodoGrasa) ?? resultados[0]
  );
}

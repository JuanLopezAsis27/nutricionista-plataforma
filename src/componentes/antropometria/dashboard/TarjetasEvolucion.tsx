import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { TemaComposicion } from "../paleta";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  SelectorEcuacion,
  ecuacionesElegidas,
  TODAS_LAS_ECUACIONES,
  type SeleccionEcuacion,
} from "../SelectorEcuacion";
import {
  EvolucionMasas,
  EvolucionScoreZ,
  EvolucionGrasa,
} from "../EvolucionMasas";

/**
 * Las tres series históricas. Solo aparecen con más de una medición: una serie
 * de un punto no dice nada y ocuparía media pantalla.
 *
 * El filtro de ecuación está acá arriba y no dentro del gráfico porque manda
 * sobre TODA la serie, y tiene dos posiciones que dicen cosas distintas:
 *
 * - **Una** es el seguimiento: la misma fórmula de punta a punta. Es la
 *   posición por defecto, en la ecuación favorita (la que el profesional
 *   destacó en su última medición; ver `ecuacionFavorita`). Mezclar Yuhasz
 *   con Durnin & Womersley a mitad de camino dibuja un salto que el paciente
 *   no vivió.
 * - **Todas** compara las ecuaciones entre sí. Cada una se validó en otra
 *   población y da otro número para el mismo paciente; ver el ancho de la
 *   banda dice cuánto de una bajada es del paciente y cuánto de la fórmula.
 *   Queda como última opción del selector.
 */
export function TarjetasEvolucion({
  mediciones,
  seleccion,
  metodosDisponibles,
  alCambiarSeleccion,
  favorita,
  tema,
}: {
  mediciones: MedicionComposicionDto[];
  seleccion: SeleccionEcuacion;
  /** Ecuaciones que al menos una medición de la serie resolvió. */
  metodosDisponibles: MetodoGrasa[];
  alCambiarSeleccion: (seleccion: SeleccionEcuacion) => void;
  /** La ecuación que el profesional destacó: la predeterminada. */
  favorita: MetodoGrasa | null;
  tema: TemaComposicion;
}) {
  if (mediciones.length <= 1) return null;

  const todas = seleccion === TODAS_LAS_ECUACIONES;

  return (
    <>
      {metodosDisponibles.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
              <span>Evolución del porcentaje graso</span>
              <SelectorEcuacion
                seleccion={seleccion}
                disponibles={metodosDisponibles}
                alCambiar={alCambiarSeleccion}
                favorita={favorita}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pr-3">
            <EvolucionGrasa
              mediciones={mediciones}
              metodos={ecuacionesElegidas(seleccion, metodosDisponibles)}
              tema={tema}
            />
            <p className="px-4 pt-2 text-xs text-muted-foreground">
              {todas
                ? "Cada ecuación se validó en una población distinta, así que dan números distintos para el mismo paciente: lo comparable es cada línea contra sí misma, nunca una contra otra."
                : "Toda la serie usa la misma ecuación. Cambiar de método a mitad de seguimiento mueve el número sin que el paciente haya cambiado."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Evolución de las masas
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pr-3">
            <div className="px-4">
              <EvolucionMasas mediciones={mediciones} tema={tema} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Score-Z de las masas
              <span className="ml-1 font-normal text-muted-foreground">
                (contra el Phantom)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pr-3">
            <EvolucionScoreZ mediciones={mediciones} tema={tema} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { TemaComposicion } from "../paleta";
import { formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { DonutMasas } from "../DonutMasas";

type Fraccionamiento = NonNullable<
  MedicionComposicionDto["resultado"]["fraccionamiento"]
>;

/** Por encima de este desvío conviene revisar la toma de medidas. */
const DESVIO_ACEPTABLE = 0.02;

/**
 * Fraccionamiento de Kerr en cinco masas.
 *
 * El pie no es decorativo: el modelo reparte el peso a partir de las medidas,
 * así que la suma de las cinco masas —el peso estructurado— no da exactamente
 * lo que marcó la balanza. Una diferencia chica es normal; una grande casi
 * siempre es un pliegue o un perímetro mal tomado, y por eso se muestra en
 * rojo en vez de esconderse.
 */
export function TarjetaFraccionamiento({
  fraccionamiento,
  anterior,
  tema,
}: {
  fraccionamiento: Fraccionamiento;
  anterior: Fraccionamiento | null;
  tema: TemaComposicion;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Fraccionamiento en 5 masas{" "}
          <span className="font-normal text-muted-foreground">
            (Kerr, 1988)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DonutMasas
          fraccionamiento={fraccionamiento}
          anterior={anterior}
          tema={tema}
        />
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Peso estructurado{" "}
          {formatearNumero(fraccionamiento.pesoEstructuradoKg)} kg · diferencia
          con la balanza{" "}
          <span
            className={cn(
              "font-medium tabular-nums",
              Math.abs(fraccionamiento.diferenciaPorcentaje) >
                DESVIO_ACEPTABLE && "text-destructive",
            )}
          >
            {formatearNumero(fraccionamiento.diferenciaPorcentaje * 100)} %
          </span>
          . Por encima del 2 % conviene revisar la toma de medidas.
        </p>
      </CardContent>
    </Card>
  );
}

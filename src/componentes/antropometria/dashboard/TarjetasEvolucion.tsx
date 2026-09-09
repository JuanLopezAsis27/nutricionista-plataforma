import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { TemaComposicion } from "../paleta";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import { DEFINICIONES_METODO } from "@/dominio/servicios/grasaPorPliegues";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  EvolucionMasas,
  EvolucionScoreZ,
  EvolucionGrasa,
} from "../EvolucionMasas";

/**
 * Las tres series históricas. Solo aparecen con más de una medición: una serie
 * de un punto no dice nada y ocuparía media pantalla.
 *
 * El selector de método está acá arriba y no dentro del gráfico porque manda
 * sobre TODA la serie: cada ecuación de pliegues da un número distinto para el
 * mismo paciente, así que mezclarlas dibujaría un salto que nadie vivió.
 */
export function TarjetasEvolucion({
  mediciones,
  metodo,
  metodosDisponibles,
  alCambiarMetodo,
  tema,
}: {
  mediciones: MedicionComposicionDto[];
  metodo: MetodoGrasa | null;
  metodosDisponibles: MetodoGrasa[];
  alCambiarMetodo: (metodo: MetodoGrasa) => void;
  tema: TemaComposicion;
}) {
  if (mediciones.length <= 1) return null;

  return (
    <>
      {metodo != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
              <span>Evolución del porcentaje graso</span>
              {metodosDisponibles.length > 1 && (
                <Select
                  value={metodo}
                  onValueChange={(valor) =>
                    alCambiarMetodo(valor as MetodoGrasa)
                  }
                >
                  <SelectTrigger className="h-8 w-auto min-w-[14rem] text-xs font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosDisponibles.map((m) => (
                      <SelectItem key={m} value={m}>
                        {DEFINICIONES_METODO[m].etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pr-3">
            <EvolucionGrasa
              mediciones={mediciones}
              metodo={metodo}
              tema={tema}
            />
            <p className="px-4 pt-2 text-xs text-muted-foreground">
              Toda la serie usa la misma ecuación. Cambiar de método a mitad de
              seguimiento mueve el número sin que el paciente haya cambiado.
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

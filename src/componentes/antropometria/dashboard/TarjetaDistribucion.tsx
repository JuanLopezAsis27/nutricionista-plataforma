import { Info } from "lucide-react";
import type {
  DistribucionAdiposa,
  DistribucionCorporal,
  DistribucionMuscular,
  PatronAdiposo,
  PatronMuscular,
} from "@/dominio/servicios/composicionCorporal";
import { formatearMedida } from "@/lib/formato";
import { FiguraCuerpo, type MarcaCuerpo } from "./FiguraCuerpo";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/componentes/ui/card";
import type { TemaComposicion } from "../paleta";

/**
 * Cómo se lee cada patrón. El texto no dice solo el nombre: dice qué
 * significa, porque "CENTRAL" a secas obliga a recordar contra qué se compara.
 */
const LECTURA_ADIPOSA: Record<PatronAdiposo, string> = {
  CENTRAL:
    "Concentra más adiposidad en el tronco que el reparto de referencia. Es el patrón asociado a mayor riesgo cardiometabólico.",
  EQUILIBRADO:
    "Reparte la adiposidad entre tronco y extremidades como el reparto de referencia.",
  PERIFERICO:
    "Concentra más adiposidad en las extremidades que el reparto de referencia.",
};

const LECTURA_MUSCULAR: Record<PatronMuscular, string> = {
  SUPERIOR:
    "El tren superior aporta más masa muscular que en el reparto de referencia.",
  EQUILIBRADO:
    "Reparte la masa muscular entre tren superior e inferior como el reparto de referencia.",
  INFERIOR:
    "El tren inferior aporta más masa muscular que en el reparto de referencia.",
};

/**
 * Dónde está la adiposidad y dónde el músculo.
 *
 * Es la pregunta que ni el fraccionamiento ni las ecuaciones de pliegues
 * contestan: los dos dan totales, y dos personas con el mismo total pueden
 * tener toda la grasa en el tronco o repartida en las extremidades.
 *
 * Las barras son el reparto CRUDO —cuánto aporta cada sitio a la suma— y el
 * patrón es la lectura: la razón tronco/extremidades del paciente contra la
 * misma razón en el humano de referencia Phantom. Se muestran las dos cosas
 * porque el reparto crudo solo no se puede juzgar: el pliegue abdominal es
 * más grueso que el tricipital en casi todo el mundo.
 */
export function TarjetaDistribucion({
  distribucion,
  tema,
}: {
  distribucion: DistribucionCorporal;
  tema: TemaComposicion;
}) {
  const { adiposa, muscular } = distribucion;
  if (adiposa == null && muscular == null) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Distribución{" "}
          <span className="font-normal text-muted-foreground">
            (dónde está, no cuánto hay)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {adiposa != null && (
          <Bloque
            titulo="Adiposidad por sitio"
            unidad="mm"
            total={adiposa.total}
            distribucion={adiposa}
            etiquetaRegionA="Tronco"
            etiquetaRegionB="Extremidades"
            regionA="TRONCO"
            color={tema.masas.adiposa}
            colorAlterno={tema.tintaSuave}
            lectura={adiposa.patron ? LECTURA_ADIPOSA[adiposa.patron] : null}
          />
        )}

        {muscular != null && (
          <Bloque
            titulo="Masa muscular por segmento"
            unidad="cm"
            total={muscular.total}
            distribucion={muscular}
            etiquetaRegionA="Tren superior"
            etiquetaRegionB="Tren inferior"
            regionA="SUPERIOR"
            color={tema.masas.muscular}
            colorAlterno={tema.tintaSuave}
            lectura={muscular.patron ? LECTURA_MUSCULAR[muscular.patron] : null}
            nota="Perímetros con el pliegue del segmento descontado, la misma corrección que usa el fraccionamiento de Kerr. El antebrazo va sin corregir: el protocolo no tiene un pliegue de antebrazo."
          />
        )}
      </CardContent>
    </Card>
  );
}

function Bloque({
  titulo,
  unidad,
  total,
  distribucion,
  etiquetaRegionA,
  etiquetaRegionB,
  regionA,
  color,
  colorAlterno,
  lectura,
  nota,
}: {
  titulo: string;
  unidad: string;
  total: number;
  distribucion: DistribucionAdiposa | DistribucionMuscular;
  etiquetaRegionA: string;
  etiquetaRegionB: string;
  regionA: string;
  color: string;
  colorAlterno: string;
  lectura: string | null;
  nota?: string;
}) {
  const { partes, razon, razonReferencia, relativa, patron } = distribucion;
  const mayor = Math.max(...partes.map((p) => p.porcentaje));

  const marcas: MarcaCuerpo[] = partes.map((parte) => ({
    campo: parte.campo,
    etiqueta: parte.etiqueta,
    porcentaje: parte.porcentaje,
    valor: parte.valor,
    color: parte.region === regionA ? color : colorAlterno,
  }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          Total {formatearMedida(total)} {unidad}
        </p>
      </div>

      {/* La figura y las barras dicen lo MISMO y no se reemplazan: el cuerpo
          contesta "dónde" sin traducir nombres de sitios, y las barras dan el
          número. En pantalla angosta la figura pasa arriba. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="mx-auto shrink-0 sm:mx-0">
          <FiguraCuerpo
            marcas={marcas}
            unidad={unidad}
            titulo={`${titulo}: cada sitio medido sobre el cuerpo, con el tamaño del punto proporcional a lo que aporta al total.`}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <ul className="space-y-1">
            {partes.map((parte) => {
              const deRegionA = parte.region === regionA;
              return (
                <li
                  key={parte.campo}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-[8.5rem] shrink-0 truncate text-xs">
                    {parte.etiqueta}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-sm bg-muted/40">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        // Relativo al sitio que más aporta: con el ancho como
                        // porcentaje absoluto, un reparto entre nueve sitios sería
                        // una fila de barras cortas todas iguales.
                        width: `${mayor > 0 ? (parte.porcentaje / mayor) * 100 : 0}%`,
                        backgroundColor: deRegionA ? color : colorAlterno,
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {formatearMedida(parte.valor)} {unidad} ·{" "}
                    {formatearMedida(parte.porcentaje)} %
                  </span>
                </li>
              );
            })}
          </ul>

          {/* La leyenda no depende solo del color: cada región dice su nombre. */}
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              {etiquetaRegionA}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: colorAlterno }}
              />
              {etiquetaRegionB}
            </span>
          </div>

          {patron != null && razon != null && razonReferencia != null && (
            <div className={cn("space-y-1 rounded-md border p-2")}>
              <p className="text-xs font-medium">{lectura}</p>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {etiquetaRegionA} / {etiquetaRegionB}:{" "}
                <span className="font-semibold">{formatearMedida(razon)}</span>{" "}
                · referencia {formatearMedida(razonReferencia)} ·{" "}
                {formatearMedida((relativa ?? 1) * 100)} % de la referencia
              </p>
            </div>
          )}

          {patron == null && (
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Falta medir sitios de las dos regiones para poder comparar el
              reparto con la referencia.
            </p>
          )}

          {nota && <p className="text-[11px] text-muted-foreground">{nota}</p>}
        </div>
      </div>
    </div>
  );
}

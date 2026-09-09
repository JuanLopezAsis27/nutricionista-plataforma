import { Ruler } from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { RiesgoCinturaCadera } from "@/dominio/servicios/composicionCorporal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Fila } from "./piezas";

const ETIQUETAS_RIESGO: Record<RiesgoCinturaCadera, string> = {
  BAJO: "Riesgo bajo",
  MODERADO: "Riesgo moderado",
  ALTO: "Riesgo alto",
  MUY_ALTO: "Riesgo muy alto",
};

/**
 * Los índices derivados de las medidas. Cada `Fila` se dibuja vacía si su
 * índice no se pudo calcular: la lista es siempre la misma, así que se ve de
 * un vistazo qué medida falta cargar.
 */
export function TarjetaIndices({
  indices,
}: {
  indices: MedicionComposicionDto["resultado"]["indices"];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <Ruler className="h-4 w-4 text-muted-foreground" /> Índices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y text-sm">
          <Fila etiqueta="IMC" valor={indices.imc} unidad="kg/m²" />
          <Fila
            etiqueta="Índice cintura/cadera"
            valor={indices.indiceCinturaCadera}
            nota={
              indices.riesgoCinturaCadera
                ? ETIQUETAS_RIESGO[indices.riesgoCinturaCadera]
                : undefined
            }
          />
          <Fila
            etiqueta="Σ 6 pliegues"
            valor={indices.sumatoria6Pliegues}
            unidad="mm"
          />
          <Fila
            etiqueta="Índice músculo/óseo"
            valor={indices.indiceMusculoOseo}
          />
          <Fila
            etiqueta="Índice adiposo/muscular"
            valor={indices.indiceAdiposoMuscular}
          />
          <Fila
            etiqueta="Índice córmico"
            valor={indices.indiceCormico}
            unidad="%"
            nota="Talla sentado / talla"
          />
          <Fila
            etiqueta="Superficie corporal"
            valor={indices.superficieCorporalM2}
            unidad="m²"
            nota="Du Bois, 1916"
          />
          <Fila
            etiqueta="Índice muscular/lastre"
            valor={indices.indiceMuscularLastre}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

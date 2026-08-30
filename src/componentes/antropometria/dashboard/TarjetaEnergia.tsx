import { Flame } from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { formatearNumero } from "@/lib/formato";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Fila } from "./piezas";

/**
 * Gasto energético y peso de referencia.
 *
 * Se muestran las tres estimaciones de metabolismo basal en vez de elegir una:
 * dan números distintos y cuál conviene depende del paciente —Cunningham sobre
 * masa libre de grasa en deportistas, Harris & Benedict en el resto—. La
 * decisión es del profesional, no de la pantalla.
 *
 * El gasto total va destacado porque es el que se usa para armar el plan.
 */
export function TarjetaEnergia({
  energia,
}: {
  energia: MedicionComposicionDto["resultado"]["energia"];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <Flame className="h-4 w-4 text-muted-foreground" /> Energía y peso de
          referencia
        </CardTitle>
      </CardHeader>
      <CardContent>
        {energia == null ? (
          <p className="text-sm text-muted-foreground">
            Para estimar el metabolismo hacen falta la talla, el sexo biológico
            y la fecha de nacimiento del paciente.
          </p>
        ) : (
          <dl className="divide-y text-sm">
            <Fila
              etiqueta="Peso ideal (OMS)"
              valor={energia.pesoIdealKg}
              unidad="kg"
              nota={`Rango ${formatearNumero(energia.pesoIdealMinKg)}–${formatearNumero(energia.pesoIdealMaxKg)} kg`}
            />
            <Fila
              etiqueta="Masa libre de grasa"
              valor={energia.masaLibreGrasaKg}
              unidad="kg"
            />
            <Fila
              etiqueta="Metabolismo basal"
              valor={energia.metabolismoBasalKcal}
              unidad="kcal"
              nota="Harris & Benedict, 1919"
            />
            <Fila
              etiqueta="MB (Cunningham)"
              valor={energia.metabolismoCunninghamKcal}
              unidad="kcal"
              nota="Sobre masa libre de grasa"
            />
            <Fila
              etiqueta="MB (Kleiber)"
              valor={energia.metabolismoKleiberKcal}
              unidad="kcal"
            />
            <Fila
              etiqueta="Gasto energético total"
              valor={energia.gastoEnergeticoTotalKcal}
              unidad="kcal"
              nota={
                energia.factorActividad != null
                  ? `Factor ${formatearNumero(energia.factorActividad)} (OMS, 1985)`
                  : "Cargá el nivel de actividad de la medición"
              }
              destacado
            />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

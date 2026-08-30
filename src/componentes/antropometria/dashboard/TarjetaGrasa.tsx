import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { TemaComposicion } from "../paleta";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/componentes/ui/card";
import { PanelGrasaPliegues, AvisoDosModelos } from "../PanelGrasaPliegues";

/**
 * Modelo de 2 componentes de la medición seleccionada.
 *
 * Cuando la medición también resuelve el fraccionamiento de Kerr, agrega el
 * aviso que compara los dos números: la brecha entre ellos es esperable y no
 * un error de carga, pero hay que decirlo o se lee como contradicción.
 */
export function TarjetaGrasa({
  actual,
  anterior,
  grasaDestacada,
  tema,
}: {
  actual: MedicionComposicionDto;
  anterior: MedicionComposicionDto | null;
  grasaDestacada:
    | MedicionComposicionDto["resultado"]["grasaPorPliegues"]["resultados"][number]
    | undefined;
  tema: TemaComposicion;
}) {
  const fraccionamiento = actual.resultado.fraccionamiento;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Grasa corporal por pliegues{" "}
          <span className="font-normal text-muted-foreground">
            (modelo de 2 componentes)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PanelGrasaPliegues
          grasa={actual.resultado.grasaPorPliegues}
          metodoDestacado={actual.metodoGrasa}
          anterior={anterior?.resultado.grasaPorPliegues ?? null}
          pesoKg={actual.medidas.pesoKg}
          tema={tema}
        />
        {fraccionamiento != null && grasaDestacada != null && (
          <AvisoDosModelos
            masaAdiposaKg={fraccionamiento.adiposa.kg}
            porcentajeAdiposa={fraccionamiento.adiposa.porcentaje}
            masaGrasaKg={grasaDestacada.masaGrasaKg}
            porcentajeGrasa={grasaDestacada.porcentajeGrasa}
            etiquetaMetodo={grasaDestacada.etiqueta}
          />
        )}
      </CardContent>
    </Card>
  );
}

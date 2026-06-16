import type { DietaSalidaDto } from "@/aplicacion/dtos/dieta.dto";
import { ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from "@/lib/formato";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

/**
 * Muestra una dieta organizada por tipo de comida (cards).
 * Reutilizada en el detalle de la dieta, el detalle del paciente y el portal.
 */
export function VistaDieta({ dieta }: { dieta: DietaSalidaDto }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{dieta.nombre}</h2>
        {dieta.descripcion && (
          <p className="text-sm text-muted-foreground">{dieta.descripcion}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ORDEN_TIPOS_COMIDA.map((tipo) => {
          const comidas = dieta.comidas.filter((c) => c.tipo === tipo);
          if (comidas.length === 0) return null;
          return (
            <Card key={tipo}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{ETIQUETAS_TIPO_COMIDA[tipo]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {comidas.map((comida) => (
                  <div key={comida.id} className="flex items-start justify-between gap-2 text-sm">
                    <span>{comida.descripcion}</span>
                    {comida.calorias != null && (
                      <span className="shrink-0 text-muted-foreground">
                        {comida.calorias} kcal
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

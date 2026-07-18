"use client";

import { FileDown, Pill } from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { VistaPlan } from "@/componentes/planes/VistaPlan";

/** Mi plan: plan nutricional activo + suplementación vigente, con PDF. */
export default function PaginaMiPlan() {
  const { miPlan } = usePlanes();
  const { misSuplementos } = useSeguimiento();
  const consulta = miPlan();
  const suplementos = misSuplementos();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Mi plan</h1>
          <p className="text-sm text-muted-foreground">
            Tu plan nutricional vigente, armado por tu nutricionista.
          </p>
        </div>
        {consulta.data && (
          <Button asChild variant="outline">
            <a href={`/api/planes/${consulta.data.id}/pdf`} target="_blank" rel="noreferrer">
              <FileDown className="h-4 w-4" />
              Descargar PDF
            </a>
          </Button>
        )}
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : consulta.data ? (
        <VistaPlan plan={consulta.data} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavía no tenés un plan asignado. Tu nutricionista lo va a cargar en tu próxima
          consulta.
        </p>
      )}

      {(suplementos.data ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-5 w-5 text-primary" /> Mi suplementación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {suplementos.data!.map((suplemento) => (
                <li key={suplemento.id} className="py-2.5 text-sm">
                  <p className="font-medium">{suplemento.nombre}</p>
                  <p className="text-muted-foreground">
                    {[suplemento.dosis, suplemento.frecuencia]
                      .filter(Boolean)
                      .join(" · ") || "Según indicación"}
                    {suplemento.hasta && ` · hasta ${formatearFecha(suplemento.hasta)}`}
                  </p>
                  {suplemento.notas && (
                    <p className="text-xs text-muted-foreground">{suplemento.notas}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { Salad } from "lucide-react";
import { useDietas } from "@/lib/hooks/useDietas";
import { Card, CardContent } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { VistaDieta } from "@/componentes/dietas/VistaDieta";

export default function PaginaMiDieta() {
  const { miDieta } = useDietas();
  const dieta = miDieta();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mi dieta</h1>

      {dieta.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : dieta.isError ? (
        <p className="text-sm text-destructive">No se pudo cargar tu dieta.</p>
      ) : dieta.data ? (
        <VistaDieta dieta={dieta.data} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Salad className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Todavía no tenés una dieta asignada. Tu nutricionista te asignará una pronto.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

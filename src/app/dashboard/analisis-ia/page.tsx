"use client";

import { Sparkles, Info, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import type { InsightPacienteDto } from "@/aplicacion/dtos/ia.dto";
import { useIA } from "@/lib/hooks/useIA";
import { cn } from "@/lib/utilidades";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

const ICONO_TIPO: Record<string, typeof TrendingUp> = {
  RIESGO_ABANDONO: AlertTriangle,
  ADHERENCIA: Activity,
  TENDENCIA_PESO: TrendingUp,
};

const ESTILO_SEVERIDAD: Record<InsightPacienteDto["severidad"], string> = {
  INFO: "text-muted-foreground",
  ATENCION: "text-primary",
  CRITICO: "text-destructive",
};

export default function PaginaAnalisisIA() {
  const { insights } = useIA();
  const consulta = insights();
  const lista = consulta.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" /> Análisis con IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Análisis predictivos sobre tus pacientes con inteligencia artificial.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          <strong>Vista previa.</strong> Este módulo todavía no está activo: muestra los
          análisis que vas a poder hacer. Los datos ya se están acumulando (turnos, diario,
          adherencia) para alimentarlos.
        </p>
      </div>

      {consulta.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lista.map((insight) => {
            const Icono = ICONO_TIPO[insight.tipo] ?? Sparkles;
            return (
              <Card key={insight.tipo} className="opacity-90">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icono className={cn("h-5 w-5", ESTILO_SEVERIDAD[insight.severidad])} />
                    {insight.titulo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{insight.detalle}</p>
                  <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                    Próximamente
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

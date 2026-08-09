"use client";

import { Sparkles, Info, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import type { InsightPacienteDto } from "@/aplicacion/dtos/ia.dto";
import { useIA } from "@/lib/hooks/useIA";
import { cn } from "@/lib/utilidades";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { AsistenteAnaliticoChat } from "@/componentes/ia/AsistenteAnaliticoChat";
import { FeedbackInsight } from "@/componentes/ia/FeedbackInsight";
import { PanelKpisAnalisis } from "@/componentes/ia/PanelKpisAnalisis";

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
  const { insights, estado } = useIA();
  const consulta = insights();
  const lista = consulta.data ?? [];
  const insightsActivo = estado().data?.insightsActivo ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" /> Análisis con IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Preguntá sobre tus datos y mirá análisis predictivos de tus pacientes.
        </p>
      </div>

      {/* Chat analítico: pregunta sobre pacientes, planes, recetas y turnos. */}
      <AsistenteAnaliticoChat />

      {/* KPIs: resumen estructurado de la práctica + lo que detectó el análisis. */}
      <PanelKpisAnalisis insights={lista} insightsActivo={insightsActivo} />

      <h2 className="pt-2 text-lg font-semibold">Advertencias del análisis</h2>

      {!insightsActivo && (
        <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            <strong>Vista previa.</strong> Este módulo todavía no está activo: muestra los
            análisis que vas a poder hacer. Los datos ya se están acumulando (turnos, diario,
            adherencia) para alimentarlos.
          </p>
        </div>
      )}

      {consulta.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lista.map((insight, i) => {
            const Icono = ICONO_TIPO[insight.tipo] ?? Sparkles;
            return (
              <Card
                key={`${insight.tipo}:${insight.pacienteId ?? i}`}
                className={cn(!insightsActivo && "opacity-90")}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icono className={cn("h-5 w-5", ESTILO_SEVERIDAD[insight.severidad])} />
                    {insight.titulo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{insight.detalle}</p>
                  {!insightsActivo && (
                    <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      Próximamente
                    </span>
                  )}
                  <FeedbackInsight insight={insight} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

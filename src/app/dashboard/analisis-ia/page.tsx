"use client";

import { Sparkles, Info } from "lucide-react";
import { useIA } from "@/lib/hooks/useIA";
import { Skeleton } from "@/componentes/ui/skeleton";
import { AsistenteAnaliticoChat } from "@/componentes/ia/AsistenteAnaliticoChat";
import { PanelKpisAnalisis } from "@/componentes/ia/PanelKpisAnalisis";
import { ListaInsights } from "@/componentes/ia/ListaInsights";

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
            <strong>Vista previa.</strong> Este módulo todavía no está activo:
            muestra los análisis que vas a poder hacer. Los datos ya se están
            acumulando (turnos, diario, adherencia) para alimentarlos.
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
        <ListaInsights insights={lista} insightsActivo={insightsActivo} />
      )}
    </div>
  );
}

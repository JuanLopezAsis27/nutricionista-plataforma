"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, AlertTriangle, Activity, Search } from "lucide-react";
import type { InsightPacienteDto } from "@/aplicacion/dtos/ia.dto";
import { cn } from "@/lib/utilidades";
import { Input } from "@/componentes/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { FeedbackInsight } from "@/componentes/ia/FeedbackInsight";

const ICONO_TIPO: Record<string, typeof TrendingUp> = {
  RIESGO_ABANDONO: AlertTriangle,
  ADHERENCIA: Activity,
  TENDENCIA_PESO: TrendingUp,
};
const LABEL_TIPO: Record<string, string> = {
  RIESGO_ABANDONO: "Riesgo de abandono",
  ADHERENCIA: "Adherencia baja",
  TENDENCIA_PESO: "Estancamiento de peso",
};
const ESTILO_SEVERIDAD: Record<InsightPacienteDto["severidad"], string> = {
  INFO: "text-muted-foreground",
  ATENCION: "text-primary",
  CRITICO: "text-destructive",
};
const FILTROS_SEVERIDAD = [
  { valor: "TODAS", etiqueta: "Todas" },
  { valor: "CRITICO", etiqueta: "Críticas" },
  { valor: "ATENCION", etiqueta: "Atención" },
] as const;

/**
 * Lista de advertencias del análisis, pensada para MUCHOS insights: filtro por
 * severidad, búsqueda por paciente y agrupación por tipo (con contador). Con el
 * módulo en demostración (sin ml-servicio) muestra las tarjetas de ejemplo sin
 * controles.
 */
export function ListaInsights({
  insights,
  insightsActivo,
}: {
  insights: InsightPacienteDto[];
  insightsActivo: boolean;
}) {
  const [severidad, setSeveridad] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState("");

  if (!insightsActivo) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, i) => (
          <TarjetaInsight key={i} insight={insight} demo />
        ))}
      </div>
    );
  }

  const q = busqueda.trim().toLowerCase();
  const filtrados = insights.filter(
    (i) =>
      (severidad === "TODAS" || i.severidad === severidad) &&
      (q === "" || i.titulo.toLowerCase().includes(q)),
  );

  const grupos = new Map<string, InsightPacienteDto[]>();
  for (const i of filtrados) {
    const arr = grupos.get(i.tipo) ?? [];
    arr.push(i);
    grupos.set(i.tipo, arr);
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS_SEVERIDAD.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setSeveridad(f.valor)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              severidad === f.valor
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.etiqueta}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar paciente…"
            className="h-8 w-48 pl-8 text-sm"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay advertencias con esos filtros.
        </p>
      ) : (
        [...grupos.entries()].map(([tipo, items]) => {
          const Icono = ICONO_TIPO[tipo] ?? Sparkles;
          return (
            <section key={tipo} className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Icono className="h-4 w-4 text-primary" />
                {LABEL_TIPO[tipo] ?? tipo}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {items.length}
                </span>
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((insight, i) => (
                  <TarjetaInsight key={`${insight.pacienteId ?? i}`} insight={insight} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function TarjetaInsight({ insight, demo = false }: { insight: InsightPacienteDto; demo?: boolean }) {
  const Icono = ICONO_TIPO[insight.tipo] ?? Sparkles;
  return (
    <Card className={cn(demo && "opacity-90")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icono className={cn("h-5 w-5", ESTILO_SEVERIDAD[insight.severidad])} />
          {insight.titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{insight.detalle}</p>
        {demo && (
          <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            Próximamente
          </span>
        )}
        <FeedbackInsight insight={insight} />
      </CardContent>
    </Card>
  );
}

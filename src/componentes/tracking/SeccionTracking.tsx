"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Target, UtensilsCrossed } from "lucide-react";
import { useTracking } from "@/lib/hooks/useTracking";
import { formatearFecha, formatearNumero, hoyLocalISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { MetricasDispositivo } from "./MetricasDispositivo";

/**
 * Paletas por tema (mismas superficies validadas que GraficoEvolucion):
 * coral para el peso, verde/rojo para cumplimiento.
 */
const TEMAS = {
  light: {
    peso: "#F4535E",
    bien: "#17996B",
    mal: "#C0392B",
    tinta: "#52514E",
    grilla: "#E1E0D9",
    fondoTooltip: "#FFFFFF",
    bordeTooltip: "rgba(11,11,11,0.10)",
    texto: "#0B0B0B",
  },
  dark: {
    peso: "#EF4E59",
    bien: "#199E70",
    mal: "#E5544B",
    tinta: "#C3C2B7",
    grilla: "#2C2C2A",
    fondoTooltip: "#1D1D20",
    bordeTooltip: "rgba(255,255,255,0.10)",
    texto: "#FFFFFF",
  },
} as const;

const PERIODOS = [
  { dias: 30, etiqueta: "30 días" },
  { dias: 60, etiqueta: "60 días" },
  { dias: 90, etiqueta: "90 días" },
] as const;

/**
 * Sección de Tracking del paciente: evolución de peso, adherencia a los axiomas
 * (hábitos) y concordancia con el plan. Se usa tanto en el portal del paciente
 * (sin `pacienteId`) como en la ficha del nutricionista (con `pacienteId`).
 */
export function SeccionTracking({ pacienteId }: { pacienteId?: string }) {
  const [dias, setDias] = useState<number>(30);
  const { miTracking, dePaciente } = useTracking();

  const hasta = useMemo(() => new Date(hoyLocalISO()), []);
  const desde = useMemo(() => {
    const d = new Date(hasta);
    d.setDate(d.getDate() - dias);
    return d;
  }, [hasta, dias]);

  const esNutri = pacienteId != null;
  const consultaNutri = dePaciente(
    { pacienteId: pacienteId ?? "", desde, hasta },
    { enabled: esNutri },
  );
  const consultaMia = miTracking({ desde, hasta }, { enabled: !esNutri });
  const consulta = esNutri ? consultaNutri : consultaMia;
  const datos = consulta.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {PERIODOS.map((p) => (
          <Button
            key={p.dias}
            size="sm"
            variant={p.dias === dias ? "default" : "outline"}
            onClick={() => setDias(p.dias)}
          >
            {p.etiqueta}
          </Button>
        ))}
      </div>

      {consulta.isLoading || !datos ? (
        <div className="space-y-4">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : datos.diasConRegistro === 0 && datos.peso.puntos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay registros en este período. Cargá tu peso, agua, sueño y comidas
          para ver tu progreso acá.
        </p>
      ) : (
        <>
          <TarjetaPeso peso={datos.peso} />
          <TarjetaAdherencia adherencia={datos.adherencia} />
          <TarjetaConcordancia concordancia={datos.concordancia} />
        </>
      )}

      {/* Datos del wearable (independiente del diario): opt-in por día. */}
      <MetricasDispositivo
        pacienteId={pacienteId}
        editable={!esNutri}
        desde={desde}
        hasta={hasta}
      />
    </div>
  );
}

// --- Peso --------------------------------------------------------------------

function TarjetaPeso({
  peso,
}: {
  peso: {
    puntos: { fecha: Date; peso: number; fuente: "DIARIO" | "CONSULTA" }[];
    inicial: number | null;
    actual: number | null;
    variacion: number | null;
  };
}) {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const tema = resolvedTheme === "dark" ? TEMAS.dark : TEMAS.light;

  const serie = peso.puntos.map((p) => ({ fecha: formatearFecha(p.fecha), valor: p.peso }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Peso
          </span>
          {peso.variacion != null && (
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                peso.variacion <= 0 ? "text-primary" : "text-muted-foreground",
              )}
            >
              {peso.variacion > 0 ? "+" : ""}
              {formatearNumero(peso.variacion)} kg
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-0 pr-3">
        {serie.length < 2 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            Con dos o más registros de peso vas a ver la curva de evolución.
          </p>
        ) : !montado ? null : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={serie} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={tema.grilla} strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fill: tema.tinta, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: tema.grilla }}
              />
              <YAxis
                domain={["auto", "auto"]}
                width={44}
                tick={{ fill: tema.tinta, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: tema.tinta, strokeDasharray: "3 3" }}
                contentStyle={{
                  backgroundColor: tema.fondoTooltip,
                  border: `1px solid ${tema.bordeTooltip}`,
                  borderRadius: 8,
                  color: tema.texto,
                  fontSize: 12,
                }}
                formatter={(valor) => [`${formatearNumero(valor as number)} kg`, "Peso"]}
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke={tema.peso}
                strokeWidth={2}
                dot={{ r: 3, fill: tema.peso, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// --- Adherencia a los axiomas ------------------------------------------------

function TarjetaAdherencia({
  adherencia,
}: {
  adherencia: {
    axiomaId: string;
    texto: string;
    objetivo: string | null;
    unidad: string | null;
    diasEvaluados: number;
    porcentaje: number | null;
    promedioPaciente: number | null;
  }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-primary" /> Hábitos y objetivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {adherencia.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay objetivos de hábitos cargados.
          </p>
        ) : (
          adherencia.map((a) => <FilaAdherencia key={a.axiomaId} adherencia={a} />)
        )}
      </CardContent>
    </Card>
  );
}

function FilaAdherencia({
  adherencia: a,
}: {
  adherencia: {
    texto: string;
    objetivo: string | null;
    unidad: string | null;
    diasEvaluados: number;
    porcentaje: number | null;
    promedioPaciente: number | null;
  };
}) {
  const evaluable = a.porcentaje != null;
  const bien = (a.porcentaje ?? 0) >= 60;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2 text-sm">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{a.texto}</p>
          <p className="text-xs text-muted-foreground">
            {a.objetivo ? `Objetivo: ${a.objetivo}` : "Guía general"}
            {a.promedioPaciente != null && (
              <>
                {" · "}Tu promedio: {formatearNumero(a.promedioPaciente)}
                {a.unidad ? ` ${a.unidad}` : ""}
              </>
            )}
          </p>
        </div>
        {evaluable && (
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              bien ? "text-primary" : "text-destructive",
            )}
          >
            {a.porcentaje}%
          </span>
        )}
      </div>
      {evaluable ? (
        <BarraProgreso porcentaje={a.porcentaje!} bien={bien} />
      ) : (
        <p className="text-xs italic text-muted-foreground">
          Recomendación informativa (no se mide automáticamente).
        </p>
      )}
    </div>
  );
}

// --- Concordancia con el plan ------------------------------------------------

function TarjetaConcordancia({
  concordancia: c,
}: {
  concordancia: {
    tienePlan: boolean;
    franjasPlanificadas: number;
    diasEvaluados: number;
    coberturaPromedio: number | null;
    porFranja: { franja: string; registrados: number; esperados: number }[];
  };
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UtensilsCrossed className="h-5 w-5 text-primary" /> Concordancia con el plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!c.tienePlan || c.franjasPlanificadas === 0 ? (
          <p className="text-sm text-muted-foreground">
            {c.tienePlan
              ? "El plan activo no tiene franjas de comida cargadas."
              : "No hay un plan activo para comparar."}
          </p>
        ) : c.diasEvaluados === 0 ? (
          <p className="text-sm text-muted-foreground">
            Registrá tus comidas para ver qué tanto seguís las franjas del plan.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Cobertura de las franjas del plan
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  (c.coberturaPromedio ?? 0) >= 60 ? "text-primary" : "text-destructive",
                )}
              >
                {c.coberturaPromedio}%
              </span>
            </div>
            <BarraProgreso
              porcentaje={c.coberturaPromedio ?? 0}
              bien={(c.coberturaPromedio ?? 0) >= 60}
            />
            <ul className="space-y-1.5 pt-1">
              {c.porFranja.map((f) => {
                const pct =
                  f.esperados > 0 ? Math.round((f.registrados / f.esperados) * 100) : 0;
                return (
                  <li key={f.franja} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate text-muted-foreground">
                      {f.franja}
                    </span>
                    <BarraProgreso porcentaje={pct} bien={pct >= 60} />
                    <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                      {f.registrados}/{f.esperados} d
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Barra de progreso reutilizable ------------------------------------------

function BarraProgreso({ porcentaje, bien }: { porcentaje: number; bien: boolean }) {
  const ancho = Math.max(0, Math.min(100, porcentaje));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", bien ? "bg-primary" : "bg-destructive")}
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingDown, TrendingUp, GlassWater, Moon, Dumbbell, UtensilsCrossed } from "lucide-react";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { formatearFecha, formatearNumero, hoyLocalISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

/**
 * Paletas por tema, validadas con el validador de dataviz contra las
 * superficies reales de las cards (#FFFFFF claro / #1D1D20 oscuro):
 * las 6 comprobaciones (banda L, croma, CVD, visión normal, contraste) en PASS.
 */
const TEMAS = {
  light: {
    consulta: "#F4535E",
    diario: "#2A78D6",
    tinta: "#52514E",
    grilla: "#E1E0D9",
    fondoTooltip: "#FFFFFF",
    bordeTooltip: "rgba(11,11,11,0.10)",
    texto: "#0B0B0B",
  },
  dark: {
    consulta: "#EF4E59",
    diario: "#3987E5",
    tinta: "#C3C2B7",
    grilla: "#2C2C2A",
    fondoTooltip: "#1D1D20",
    bordeTooltip: "rgba(255,255,255,0.10)",
    texto: "#FFFFFF",
  },
} as const;

const RANGOS = [
  { dias: 30, etiqueta: "30 días" },
  { dias: 60, etiqueta: "60 días" },
  { dias: 90, etiqueta: "90 días" },
] as const;

const DIA_MS = 24 * 60 * 60 * 1000;

/** Pestaña Informes de la ficha: progreso de peso + resumen de hábitos. */
export function SeccionInformes({ pacienteId }: { pacienteId: string }) {
  const { informeProgreso, informeHabitos } = useSeguimiento();
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  const [dias, setDias] = useState<number>(90);
  useEffect(() => setMontado(true), []);

  // Fechas ancladas al día local (claves de query estables dentro del día).
  const hasta = new Date(hoyLocalISO());
  const desde = new Date(hasta.getTime() - (dias - 1) * DIA_MS);

  const progreso = informeProgreso({ pacienteId, desde, hasta });
  const habitos = informeHabitos({ pacienteId, desde, hasta });

  if (!montado) return null; // evita desajuste de hidratación por el tema
  const tema = resolvedTheme === "dark" ? TEMAS.dark : TEMAS.light;

  const puntos = (progreso.data?.puntos ?? []).map((punto) => ({
    fecha: formatearFecha(punto.fecha),
    consulta: punto.pesoConsulta,
    diario: punto.pesoDiario,
  }));

  const variacion = progreso.data?.variacionKg ?? null;

  return (
    <div className="space-y-6">
      {/* Selector de rango (una fila, arriba de los gráficos) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Informe de los últimos {dias} días</h3>
        <div className="flex gap-1 rounded-md border p-0.5">
          {RANGOS.map((rango) => (
            <Button
              key={rango.dias}
              variant={dias === rango.dias ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDias(rango.dias)}
            >
              {rango.etiqueta}
            </Button>
          ))}
        </div>
      </div>

      {/* Progreso de peso */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-baseline justify-between text-sm font-semibold">
            <span>
              Peso <span className="font-normal text-muted-foreground">(kg)</span>
            </span>
            {variacion != null && (
              <span
                className={cn(
                  "flex items-center gap-1 text-sm tabular-nums",
                  variacion <= 0 ? "text-primary" : "text-muted-foreground",
                )}
              >
                {variacion <= 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {variacion > 0 ? "+" : ""}
                {formatearNumero(variacion)} kg en el período
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pl-0 pr-3">
          {progreso.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : puntos.length === 0 ? (
            <p className="px-6 pb-4 text-sm text-muted-foreground">
              Sin registros de peso en el período (ni de consulta ni del diario).
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={puntos} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={tema.grilla} strokeWidth={1} vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tick={{ fill: tema.tinta, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: tema.grilla }}
                  minTickGap={24}
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
                  formatter={(valor, nombre) => [
                    `${formatearNumero(valor as number)} kg`,
                    nombre === "consulta" ? "En consulta" : "Diario del paciente",
                  ]}
                />
                <Legend
                  formatter={(valor) => (
                    <span style={{ color: tema.tinta, fontSize: 12 }}>
                      {valor === "consulta" ? "En consulta" : "Diario del paciente"}
                    </span>
                  )}
                />
                {/* Consulta: pocas mediciones → línea con marcadores grandes. */}
                <Line
                  type="monotone"
                  dataKey="consulta"
                  stroke={tema.consulta}
                  strokeWidth={2}
                  dot={{ r: 4, fill: tema.consulta, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={false}
                />
                {/* Diario: serie densa → línea fina sin marcadores. */}
                <Line
                  type="monotone"
                  dataKey="diario"
                  stroke={tema.diario}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Hábitos */}
      {habitos.isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : habitos.data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <TarjetaHabito
            icono={GlassWater}
            titulo="Agua promedio"
            valor={
              habitos.data.aguaPromedioMl != null
                ? `${formatearNumero(habitos.data.aguaPromedioMl)} ml`
                : "—"
            }
            detalle={`${habitos.data.diasConRegistro} de ${habitos.data.diasEnRango} días con registro`}
          />
          <TarjetaHabito
            icono={Moon}
            titulo="Sueño promedio"
            valor={
              habitos.data.horasSuenoPromedio != null
                ? `${formatearNumero(habitos.data.horasSuenoPromedio)} h`
                : "—"
            }
            detalle={`Calidad: ${habitos.data.calidadSueno.BUENA} buena · ${habitos.data.calidadSueno.REGULAR} regular · ${habitos.data.calidadSueno.MALA} mala`}
          />
          <TarjetaHabito
            icono={Dumbbell}
            titulo="Actividad física"
            valor={`${habitos.data.diasConActividad} día(s)`}
            detalle={`${habitos.data.minutosActividadTotal} min en total`}
          />
          <TarjetaHabito
            icono={UtensilsCrossed}
            titulo="Comidas registradas"
            valor={`${habitos.data.comidasRegistradas}`}
            detalle="en el diario del período"
          />
        </div>
      ) : null}
    </div>
  );
}

function TarjetaHabito({
  icono: Icono,
  titulo,
  valor,
  detalle,
}: {
  icono: typeof GlassWater;
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icono className="h-3.5 w-3.5" /> {titulo}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}

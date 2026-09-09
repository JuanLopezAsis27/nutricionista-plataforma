"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { Skeleton } from "@/componentes/ui/skeleton";
import { TEMAS_GRAFICO } from "@/componentes/estadisticas/paletaGraficos";
import { agruparPorSemana, lunesDe } from "./semanas";

/**
 * Turnos por semana de las últimas semanas, agendados contra completados.
 *
 * Es el mismo par de series que el gráfico mensual de Estadísticas —y la misma
 * paleta— pero en la escala en la que se trabaja el día a día: un mes tarda
 * demasiado en decir si la agenda se está vaciando.
 *
 * Se calcula sobre los turnos que el dashboard YA tiene cargados: no agrega
 * ninguna consulta. Los cancelados no cuentan como agendados —el turno no
 * ocupó la agenda— pero tampoco se pierden: la diferencia entre las dos barras
 * es lo que no se atendió.
 */
export function GraficoTurnosSemanales({
  turnos,
  hoy,
  cargando,
}: {
  turnos: TurnoSalidaDto[];
  /** El día de hoy en ISO. Lo fija el dashboard, que ya lo tiene anclado. */
  hoy: string;
  cargando: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (cargando) return <Skeleton className="h-56 w-full" />;
  if (!montado) return null; // evita desajuste de hidratación por el tema

  const tema =
    resolvedTheme === "dark" ? TEMAS_GRAFICO.dark : TEMAS_GRAFICO.light;
  const filas = agruparPorSemana(turnos, lunesDe(hoy));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={filas}
        margin={{ top: 6, right: 12, bottom: 0, left: 0 }}
        barGap={2}
      >
        <CartesianGrid stroke={tema.grilla} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="etiqueta"
          tick={{ fill: tema.tinta, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: tema.grilla }}
        />
        <YAxis
          allowDecimals={false}
          width={32}
          tick={{ fill: tema.tinta, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: tema.grilla, fillOpacity: 0.3 }}
          contentStyle={{
            backgroundColor: tema.fondoTooltip,
            border: `1px solid ${tema.bordeTooltip}`,
            borderRadius: 8,
            color: tema.texto,
            fontSize: 12,
          }}
          labelFormatter={(etiqueta) => `Semana del ${etiqueta}`}
          formatter={(valor, nombre) => [
            valor as number,
            nombre === "agendados" ? "Agendados" : "Completados",
          ]}
        />
        <Legend
          formatter={(valor) => (
            <span style={{ color: tema.tinta, fontSize: 12 }}>
              {valor === "agendados" ? "Agendados" : "Completados"}
            </span>
          )}
        />
        <Bar
          dataKey="agendados"
          fill={tema.total}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="completados"
          fill={tema.completados}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

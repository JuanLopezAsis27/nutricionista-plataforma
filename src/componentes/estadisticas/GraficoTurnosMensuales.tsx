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
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Paleta categórica de 2 series, reutilizada de los informes de F5 y validada
 * con el validador de dataviz contra las superficies de card
 * (#FFFFFF claro / #1D1D20 oscuro): las 6 comprobaciones en PASS.
 */
const TEMAS = {
  light: {
    total: "#2A78D6",
    completados: "#F4535E",
    tinta: "#52514E",
    grilla: "#E1E0D9",
    fondoTooltip: "#FFFFFF",
    bordeTooltip: "rgba(11,11,11,0.10)",
    texto: "#0B0B0B",
  },
  dark: {
    total: "#3987E5",
    completados: "#EF4E59",
    tinta: "#C3C2B7",
    grilla: "#2C2C2A",
    fondoTooltip: "#1D1D20",
    bordeTooltip: "rgba(255,255,255,0.10)",
    texto: "#FFFFFF",
  },
} as const;

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** Convierte "AAAA-MM" a una etiqueta corta "jul 26". */
function etiquetaMes(mes: string): string {
  const [anio = "", m = ""] = mes.split("-");
  return `${MESES_CORTOS[Number(m) - 1] ?? m} ${anio.slice(2)}`;
}

interface PuntoSerie {
  mes: string;
  total: number;
  completados: number;
}

/** Gráfico de barras: turnos agendados vs. completados por mes. */
export function GraficoTurnosMensuales({
  datos,
  cargando,
}: {
  datos: PuntoSerie[];
  cargando: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (cargando) return <Skeleton className="h-56 w-full" />;
  if (!montado) return null; // evita desajuste de hidratación por el tema

  const tema = resolvedTheme === "dark" ? TEMAS.dark : TEMAS.light;
  const filas = datos.map((punto) => ({
    mes: etiquetaMes(punto.mes),
    total: punto.total,
    completados: punto.completados,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={filas} margin={{ top: 6, right: 12, bottom: 0, left: 0 }} barGap={2}>
        <CartesianGrid stroke={tema.grilla} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="mes"
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
          formatter={(valor, nombre) => [
            valor as number,
            nombre === "total" ? "Agendados" : "Completados",
          ]}
        />
        <Legend
          formatter={(valor) => (
            <span style={{ color: tema.tinta, fontSize: 12 }}>
              {valor === "total" ? "Agendados" : "Completados"}
            </span>
          )}
        />
        <Bar dataKey="total" fill={tema.total} radius={[4, 4, 0, 0]} isAnimationActive={false} />
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

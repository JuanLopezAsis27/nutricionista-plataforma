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
  ResponsiveContainer,
} from "recharts";
import type { MedicionEvolucionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

/**
 * Paletas por tema, validadas con el validador de dataviz contra las
 * superficies reales de las cards (#FFFFFF claro / #1D1D20 oscuro):
 * banda de luminosidad, croma, separación CVD y contraste ≥ 3:1 en PASS.
 */
const TEMAS = {
  light: {
    series: { peso: "#F4535E", pliegues: "#2A78D6", cintura: "#17996B" },
    tinta: "#52514E",
    grilla: "#E1E0D9",
    fondoTooltip: "#FFFFFF",
    bordeTooltip: "rgba(11,11,11,0.10)",
    texto: "#0B0B0B",
  },
  dark: {
    series: { peso: "#EF4E59", pliegues: "#3987E5", cintura: "#199E70" },
    tinta: "#C3C2B7",
    grilla: "#2C2C2A",
    fondoTooltip: "#1D1D20",
    bordeTooltip: "rgba(255,255,255,0.10)",
    texto: "#FFFFFF",
  },
} as const;

interface PuntoGrafico {
  fecha: string;
  valor: number;
}

interface PropsPanel {
  titulo: string;
  unidad: string;
  datos: PuntoGrafico[];
  color: string;
  tema: (typeof TEMAS)["light"] | (typeof TEMAS)["dark"];
}

/** Un panel del gráfico: una sola serie, el título lleva la identidad. */
function PanelEvolucion({ titulo, unidad, datos, color, tema }: PropsPanel) {
  const ultimo = datos.at(-1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-baseline justify-between text-sm font-semibold">
          <span>
            {titulo}{" "}
            <span className="font-normal text-muted-foreground">({unidad})</span>
          </span>
          {ultimo && (
            <span className="tabular-nums" style={{ color }}>
              {formatearNumero(ultimo.valor)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-0 pr-3">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={datos} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
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
              formatter={(valor) => [
                `${formatearNumero(valor as number)} ${unidad}`,
                titulo,
              ]}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Evolución antropométrica como "small multiples": tres paneles con el mismo
 * eje de fechas — peso, Σ6 pliegues y cintura máxima. Unidades distintas
 * jamás comparten eje (regla de un solo eje).
 */
export function GraficoEvolucion({ mediciones }: { mediciones: MedicionEvolucionDto[] }) {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (mediciones.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Con dos o más consultas registradas vas a ver acá la evolución graficada.
      </p>
    );
  }
  if (!montado) return null; // evita desajuste de hidratación por el tema

  const tema = resolvedTheme === "dark" ? TEMAS.dark : TEMAS.light;

  const serie = (valor: (m: MedicionEvolucionDto) => number | null): PuntoGrafico[] =>
    mediciones
      .filter((m) => valor(m) != null)
      .map((m) => ({ fecha: formatearFecha(m.fecha), valor: valor(m)! }));

  const peso = serie((m) => m.pesoKg);
  const pliegues = serie((m) => m.sumatoria6Pliegues);
  const cintura = serie((m) => m.circCinturaMaxima);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <PanelEvolucion
        titulo="Peso"
        unidad="kg"
        datos={peso}
        color={tema.series.peso}
        tema={tema}
      />
      {pliegues.length >= 2 && (
        <PanelEvolucion
          titulo="Σ 6 pliegues"
          unidad="mm"
          datos={pliegues}
          color={tema.series.pliegues}
          tema={tema}
        />
      )}
      {cintura.length >= 2 && (
        <PanelEvolucion
          titulo="Cintura máxima"
          unidad="cm"
          datos={cintura}
          color={tema.series.cintura}
          tema={tema}
        />
      )}
    </div>
  );
}

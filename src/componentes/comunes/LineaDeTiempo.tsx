"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatearFecha, formatearMedida } from "@/lib/formato";

/** Los colores que la línea toma del tema de la pantalla que la usa. */
export interface ColoresLineaDeTiempo {
  linea: string;
  grilla: string;
  tinta: string;
  eje: string;
  superficie: string;
  borde: string;
  texto: string;
}

/**
 * Una serie de UN valor sobre un eje de TIEMPO real: las marcas caen en las
 * fechas medidas, pero separadas por lo que separa a las consultas —dos
 * consultas a una semana quedan juntas y una a los tres meses, lejos—. Con un
 * eje de categorías las dos distancias se dibujarían iguales y la pendiente
 * mentiría.
 *
 * El eje Y no arranca en cero: es una línea, y lo que se lee es el recorrido.
 * Desde cero, bajar de 82 a 79 kg queda aplastado contra el techo.
 */
export function LineaDeTiempo({
  puntos,
  unidad,
  nombre,
  colores,
  alto = 220,
}: {
  /** Ordenados por fecha; los de fecha repetida no se esperan. */
  puntos: { fecha: Date; valor: number }[];
  unidad: string;
  /** Cómo se llama el valor en el tooltip. */
  nombre: string;
  colores: ColoresLineaDeTiempo;
  alto?: number;
}) {
  const datos = puntos.map((p) => ({
    tiempo: new Date(p.fecha).getTime(),
    valor: p.valor,
  }));
  const valores = datos.map((d) => d.valor);
  const minimo = Math.floor(Math.min(...valores) - 1);
  const maximo = Math.ceil(Math.max(...valores) + 1);

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <LineChart
        data={datos}
        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          stroke={colores.grilla}
          strokeWidth={1}
          vertical={false}
        />
        <XAxis
          dataKey="tiempo"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          ticks={datos.map((d) => d.tiempo)}
          tickFormatter={(valor: number) => formatearFecha(new Date(valor))}
          tick={{ fill: colores.tinta, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colores.eje }}
          minTickGap={16}
        />
        <YAxis
          width={48}
          domain={[minimo, maximo]}
          tick={{ fill: colores.tinta, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit={` ${unidad}`}
        />
        <Tooltip
          cursor={{ stroke: colores.eje, strokeWidth: 1 }}
          contentStyle={{
            backgroundColor: colores.superficie,
            border: `1px solid ${colores.borde}`,
            borderRadius: 8,
            color: colores.texto,
            fontSize: 12,
          }}
          labelFormatter={(valor) => formatearFecha(new Date(Number(valor)))}
          formatter={(valor) => [
            `${formatearMedida(valor as number)} ${unidad}`,
            nombre,
          ]}
        />
        <Line
          type="linear"
          dataKey="valor"
          name={nombre}
          stroke={colores.linea}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{
            r: 4,
            fill: colores.linea,
            stroke: colores.superficie,
            strokeWidth: 2,
          }}
          activeDot={{
            r: 6,
            fill: colores.linea,
            stroke: colores.superficie,
            strokeWidth: 2,
          }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

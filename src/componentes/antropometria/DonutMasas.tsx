"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { Fraccionamiento } from "@/dominio/servicios/composicionCorporal";
import { formatearMedida } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  MASAS,
  ETIQUETAS_MASA,
  DESCRIPCIONES_MASA,
  type ClaveMasa,
  type TemaComposicion,
} from "./paleta";

interface PropsDonut {
  fraccionamiento: Fraccionamiento;
  /** Fraccionamiento de la medición anterior, para mostrar la diferencia. */
  anterior?: Fraccionamiento | null;
  tema: TemaComposicion;
}

interface Gajo {
  clave: ClaveMasa;
  nombre: string;
  kg: number;
  porcentaje: number;
  color: string;
  diferencia: number | null;
}

/**
 * Fraccionamiento en 5 masas como anillo.
 *
 * Es un donut plano, no una torta en perspectiva: la perspectiva agranda los
 * gajos del frente y achica los del fondo, y acá la diferencia entre 18 % y
 * 12 % de masa adiposa es justamente el dato. La riqueza visual la ponen el
 * degradado por gajo, la separación entre segmentos, el realce al pasar el
 * mouse y el total en el centro — nada de eso miente sobre el área.
 *
 * Cada gajo lleva etiqueta directa: en tema claro tres de los cinco colores
 * quedan por debajo de 3:1 contra el fondo blanco, y la etiqueta es la que
 * sostiene la identidad.
 */
export function DonutMasas({ fraccionamiento, anterior, tema }: PropsDonut) {
  const [activo, setActivo] = useState<number | null>(null);

  const gajos: Gajo[] = MASAS.map((clave) => ({
    clave,
    nombre: ETIQUETAS_MASA[clave],
    kg: fraccionamiento[clave].kg,
    porcentaje: fraccionamiento[clave].porcentaje,
    color: tema.masas[clave],
    diferencia: anterior
      ? redondear(fraccionamiento[clave].kg - anterior[clave].kg)
      : null,
  }));

  const total = gajos.reduce((suma, gajo) => suma + gajo.kg, 0);
  const destacado = activo != null ? gajos[activo] : null;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] sm:items-center">
      <div className="relative h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {gajos.map((gajo) => (
                <radialGradient
                  key={gajo.clave}
                  id={`masa-${gajo.clave}`}
                  cx="50%"
                  cy="50%"
                  r="70%"
                >
                  <stop
                    offset="55%"
                    stopColor={gajo.color}
                    stopOpacity={0.78}
                  />
                  <stop offset="100%" stopColor={gajo.color} stopOpacity={1} />
                </radialGradient>
              ))}
            </defs>
            <Pie
              data={gajos}
              dataKey="kg"
              nameKey="nombre"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="88%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              stroke={tema.superficie}
              strokeWidth={2}
              onMouseEnter={(_, indice: number) => setActivo(indice)}
              onMouseLeave={() => setActivo(null)}
              isAnimationActive={false}
            >
              {gajos.map((gajo, indice) => (
                <Cell
                  key={gajo.clave}
                  fill={`url(#masa-${gajo.clave})`}
                  opacity={activo == null || activo === indice ? 1 : 0.35}
                  style={{ transition: "opacity 150ms ease" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centro del anillo: el total, o el gajo señalado. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {destacado ? (
            <>
              <span
                className="text-xs font-medium"
                style={{ color: tema.tinta }}
              >
                {destacado.nombre}
              </span>
              <span className="text-3xl font-bold tabular-nums">
                {formatearMedida(destacado.kg)}
                <span className="ml-0.5 text-base font-normal">kg</span>
              </span>
              <span
                className="text-sm tabular-nums"
                style={{ color: tema.tinta }}
              >
                {formatearMedida(destacado.porcentaje)} % del peso
              </span>
              <span
                className="mt-1 max-w-[9rem] text-[11px] leading-tight"
                style={{ color: tema.tintaSuave }}
              >
                {DESCRIPCIONES_MASA[destacado.clave]}
              </span>
            </>
          ) : (
            <>
              <span
                className="text-xs font-medium"
                style={{ color: tema.tinta }}
              >
                Peso total
              </span>
              <span className="text-3xl font-bold tabular-nums">
                {formatearMedida(total)}
                <span className="ml-0.5 text-base font-normal">kg</span>
              </span>
              <span className="text-[11px]" style={{ color: tema.tintaSuave }}>
                5 masas · Kerr, 1988
              </span>
            </>
          )}
        </div>
      </div>

      {/* Leyenda con etiquetas directas: identidad sin depender del color. */}
      <ul className="space-y-1.5">
        {gajos.map((gajo, indice) => (
          <li
            key={gajo.clave}
            className={cn(
              "flex items-baseline gap-2 rounded-md px-2 py-1 text-sm transition-colors",
              activo === indice && "bg-muted",
            )}
            onMouseEnter={() => setActivo(indice)}
            onMouseLeave={() => setActivo(null)}
          >
            <span
              aria-hidden
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: gajo.color }}
            />
            <span className="min-w-0 flex-1 truncate">{gajo.nombre}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatearMedida(gajo.kg)} kg
            </span>
            <span
              className="w-12 shrink-0 text-right text-xs tabular-nums"
              style={{ color: tema.tinta }}
            >
              {formatearMedida(gajo.porcentaje)} %
            </span>
          </li>
        ))}
        {gajos.some((gajo) => gajo.diferencia != null) && (
          <li
            className="px-2 pt-1 text-[11px] leading-snug"
            style={{ color: tema.tintaSuave }}
          >
            Contra la medición anterior:{" "}
            {gajos
              .filter(
                (gajo) => gajo.diferencia != null && gajo.diferencia !== 0,
              )
              .map(
                (gajo) =>
                  `${gajo.nombre} ${gajo.diferencia! > 0 ? "+" : ""}${formatearMedida(
                    gajo.diferencia,
                  )} kg`,
              )
              .join(" · ") || "sin cambios"}
          </li>
        )}
      </ul>
    </div>
  );
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

"use client";

import { useState } from "react";
import type { Somatotipo } from "@/dominio/servicios/composicionCorporal";
import { formatearFecha, formatearMedida } from "@/lib/formato";
import type { TemaComposicion } from "./paleta";

/** Un somatotipo ubicado en el tiempo. */
export interface PuntoSomatocarta {
  fecha: Date;
  somatotipo: Somatotipo;
}

/**
 * Somatocarta de Heath & Carter dibujada a mano en SVG.
 *
 * No es un scatter genérico: el fondo es el triángulo de referencia con sus
 * tres vértices (endo abajo-izquierda, meso arriba, ecto abajo-derecha), y lo
 * que interesa no es un punto sino el RECORRIDO entre consultas — por eso las
 * mediciones van unidas por una línea, con la última destacada.
 *
 * Coordenadas del modelo: x = ecto − endo, y = 2·meso − (endo + ecto).
 */
export function Somatocarta({
  puntos,
  tema,
}: {
  puntos: PuntoSomatocarta[];
  tema: TemaComposicion;
}) {
  const [activo, setActivo] = useState<number | null>(null);

  if (puntos.length === 0) return null;

  // Lienzo en coordenadas del modelo, con margen para las etiquetas.
  const ancho = 360;
  const alto = 320;
  const margen = 30;
  const rangoX: [number, number] = [-9, 9];
  const rangoY: [number, number] = [-10, 16];

  const aX = (x: number): number =>
    margen + ((x - rangoX[0]) / (rangoX[1] - rangoX[0])) * (ancho - 2 * margen);
  const aY = (y: number): number =>
    alto -
    margen -
    ((y - rangoY[0]) / (rangoY[1] - rangoY[0])) * (alto - 2 * margen);

  const trayectoria = puntos
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${aX(p.somatotipo.x)},${aY(p.somatotipo.y)}`,
    )
    .join(" ");

  const ultimo = puntos[puntos.length - 1]!;
  const señalado = activo != null ? puntos[activo]! : ultimo;
  const s = señalado.somatotipo;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="h-auto w-full max-w-md"
        role="img"
        aria-label={`Somatocarta: endomorfia ${s.endomorfia}, mesomorfia ${s.mesomorfia}, ectomorfia ${s.ectomorfia}`}
      >
        {/* Grilla recesiva cada 2 unidades. */}
        {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((x) => (
          <line
            key={`vx${x}`}
            x1={aX(x)}
            y1={aY(rangoY[0])}
            x2={aX(x)}
            y2={aY(rangoY[1])}
            stroke={tema.grilla}
            strokeWidth={1}
          />
        ))}
        {[-8, -4, 0, 4, 8, 12, 16].map((y) => (
          <line
            key={`hz${y}`}
            x1={aX(rangoX[0])}
            y1={aY(y)}
            x2={aX(rangoX[1])}
            y2={aY(y)}
            stroke={tema.grilla}
            strokeWidth={1}
          />
        ))}

        {/* Triángulo de referencia: los tres tipos extremos. */}
        <polygon
          points={`${aX(0)},${aY(14)} ${aX(-7)},${aY(-7)} ${aX(7)},${aY(-7)}`}
          fill="none"
          stroke={tema.eje}
          strokeWidth={2}
          strokeDasharray="6 4"
        />

        {/* Ejes centrales. */}
        <line
          x1={aX(rangoX[0])}
          y1={aY(0)}
          x2={aX(rangoX[1])}
          y2={aY(0)}
          stroke={tema.eje}
          strokeWidth={2}
        />
        <line
          x1={aX(0)}
          y1={aY(rangoY[0])}
          x2={aX(0)}
          y2={aY(rangoY[1])}
          stroke={tema.eje}
          strokeWidth={2}
        />

        <text
          x={aX(0)}
          y={aY(15.4)}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill={tema.tinta}
        >
          MESOMORFIA
        </text>
        <text
          x={aX(-8.6)}
          y={aY(-8.6)}
          fontSize={11}
          fontWeight={600}
          fill={tema.tinta}
        >
          ENDOMORFIA
        </text>
        <text
          x={aX(8.6)}
          y={aY(-8.6)}
          textAnchor="end"
          fontSize={11}
          fontWeight={600}
          fill={tema.tinta}
        >
          ECTOMORFIA
        </text>

        {/* Recorrido entre consultas. */}
        {puntos.length > 1 && (
          <path
            d={trayectoria}
            fill="none"
            stroke={tema.tintaSuave}
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
        )}

        {puntos.map((punto, indice) => {
          const esUltimo = indice === puntos.length - 1;
          const destacado = activo === indice || (activo == null && esUltimo);
          return (
            <circle
              key={punto.fecha.toISOString()}
              cx={aX(punto.somatotipo.x)}
              cy={aY(punto.somatotipo.y)}
              r={destacado ? 9 : 6}
              fill={esUltimo ? tema.masas.adiposa : tema.masas.muscular}
              stroke={tema.superficie}
              strokeWidth={2}
              opacity={esUltimo ? 1 : 0.75}
              style={{ cursor: "pointer", transition: "r 120ms ease" }}
              onMouseEnter={() => setActivo(indice)}
              onMouseLeave={() => setActivo(null)}
            >
              <title>
                {formatearFecha(punto.fecha)} — {punto.somatotipo.endomorfia} /{" "}
                {punto.somatotipo.mesomorfia} / {punto.somatotipo.ectomorfia}
              </title>
            </circle>
          );
        })}
      </svg>

      <dl className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">
          {formatearFecha(señalado.fecha)}
          {activo == null && puntos.length > 1 && " (última)"}
        </p>
        <ValorSomatotipo
          etiqueta="Endomorfia"
          detalle="Adiposidad relativa"
          valor={s.endomorfia}
          color={tema.masas.adiposa}
        />
        <ValorSomatotipo
          etiqueta="Mesomorfia"
          detalle="Desarrollo músculo-esquelético"
          valor={s.mesomorfia}
          color={tema.masas.muscular}
        />
        <ValorSomatotipo
          etiqueta="Ectomorfia"
          detalle="Linearidad relativa"
          valor={s.ectomorfia}
          color={tema.masas.osea}
        />
        <p className="pt-1 text-xs text-muted-foreground">
          HWR {formatearMedida(s.hwr)} · Σ pliegues corregida{" "}
          {formatearMedida(s.sumatoriaPliegues)}
        </p>
      </dl>
    </div>
  );
}

function ValorSomatotipo({
  etiqueta,
  detalle,
  valor,
  color,
}: {
  etiqueta: string;
  detalle: string;
  valor: number;
  color: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-[3px]"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <dt className="text-sm font-medium leading-tight">
          {etiqueta}{" "}
          <span className="font-bold tabular-nums">
            {formatearMedida(valor)}
          </span>
        </dt>
        <dd className="text-xs text-muted-foreground">{detalle}</dd>
      </div>
    </div>
  );
}

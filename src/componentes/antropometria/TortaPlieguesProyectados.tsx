"use client";

import { useId, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TriangleAlert } from "lucide-react";
import type { ProyeccionPliegues } from "@/dominio/servicios/grasaPorPliegues";
import { formatearMedida } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import type { TemaComposicion } from "./paleta";

/** Un pliegue con su color asignado. */
interface Gajo {
  campo: string;
  etiqueta: string;
  actualMm: number;
  objetivoMm: number;
  diferenciaMm: number;
  color: string;
}

/** Un tramo del anillo: parte que se mantiene o margen a cambiar. */
interface Segmento {
  clave: string;
  gajo: Gajo;
  valor: number;
  esMargen: boolean;
}

/**
 * Pliegues de hoy y cómo quedarían al alcanzar la meta.
 *
 * Dos tortas separadas: la izquierda es lo medido, la derecha la meta. Las dos
 * usan los MISMOS ángulos —los de hoy— para que se comparen gajo contra gajo;
 * lo que cambia es el relleno. En la de la meta, la porción que hay que perder
 * va rayada a 45° sobre el color del pliegue: así el margen se distingue del
 * dato medido sin depender del color, que es lo que corresponde cuando una
 * parte es medición y la otra es propuesta.
 */
export function TortaPlieguesProyectados({
  proyeccion,
  tema,
}: {
  proyeccion: ProyeccionPliegues;
  tema: TemaComposicion;
}) {
  const [activo, setActivo] = useState<string | null>(null);
  // Los patterns viven dentro del SVG y necesitan ids únicos por instancia:
  // hay una torta por objetivo en la misma página.
  const idBase = useId().replace(/:/g, "");

  const gajos: Gajo[] = proyeccion.pliegues.map((pliegue, indice) => ({
    ...pliegue,
    color: tema.pliegues[indice % tema.pliegues.length]!,
  }));

  /**
   * Dos tramos por pliegue: lo que se mantiene y el margen a cambiar. En la
   * torta de hoy los dos se pintan sólidos (juntos son el valor medido); en la
   * de la meta, el margen va rayado.
   */
  const segmentos: Segmento[] = gajos.flatMap((gajo) => {
    const seMantiene = Math.min(gajo.objetivoMm, gajo.actualMm);
    const margen = Math.abs(gajo.actualMm - gajo.objetivoMm);
    return [
      { clave: `${gajo.campo}-base`, gajo, valor: seMantiene, esMargen: false },
      { clave: `${gajo.campo}-margen`, gajo, valor: margen, esMargen: true },
    ].filter((segmento) => segmento.valor > 0);
  });

  const señalado = gajos.find((g) => g.campo === activo) ?? null;
  const baja = proyeccion.sumaObjetivoMm < proyeccion.sumaActualMm;
  const totalMargen = Math.abs(
    proyeccion.sumaActualMm - proyeccion.sumaObjetivoMm,
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Torta
          titulo="Hoy"
          suma={proyeccion.sumaActualMm}
          segmentos={segmentos}
          idBase={idBase}
          activo={activo}
          onActivo={setActivo}
          tema={tema}
          conMargen={false}
        />
        <Torta
          titulo="Al alcanzar la meta"
          suma={proyeccion.sumaObjetivoMm}
          segmentos={segmentos}
          idBase={idBase}
          activo={activo}
          onActivo={setActivo}
          tema={tema}
          conMargen
          destacado
        />
      </div>

      {/* Etiquetas directas: en tema claro tres de los seis colores quedan por
          debajo de 3:1 y la identidad la sostiene el texto, no el gajo. */}
      <ul className="space-y-1">
        {gajos.map((gajo) => (
          <li
            key={gajo.campo}
            className={cn(
              "flex items-baseline gap-2 rounded-md px-2 py-1 text-sm transition-colors",
              activo === gajo.campo && "bg-muted",
            )}
            onMouseEnter={() => setActivo(gajo.campo)}
            onMouseLeave={() => setActivo(null)}
          >
            <span
              aria-hidden
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: gajo.color }}
            />
            <span className="min-w-0 flex-1 truncate text-xs">
              {gajo.etiqueta}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatearMedida(gajo.actualMm)}
            </span>
            <span
              aria-hidden
              className="shrink-0 text-xs text-muted-foreground"
            >
              →
            </span>
            <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums">
              {formatearMedida(gajo.objetivoMm)}
            </span>
            <span
              className="w-14 shrink-0 text-right text-xs tabular-nums"
              style={{
                color: gajo.diferenciaMm <= 0 ? tema.bien : tema.atencion,
              }}
            >
              {gajo.diferenciaMm > 0 ? "+" : ""}
              {formatearMedida(gajo.diferenciaMm)} mm
            </span>
          </li>
        ))}
      </ul>

      {/* Qué significa la trama: sin esto el rayado es decoración. */}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-5 rounded-[2px]"
            style={{ backgroundColor: tema.tinta }}
          />
          Se mantiene
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-5 rounded-[2px]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${tema.tinta} 0 2px, transparent 2px 4px)`,
              border: `1px solid ${tema.eje}`,
            }}
          />
          {baja ? "A bajar" : "A subir"}:{" "}
          <span className="font-medium tabular-nums">
            {formatearMedida(totalMargen)} mm
          </span>{" "}
          en total
        </span>
      </p>

      {proyeccion.fueraDeRango && (
        <p
          className="flex items-start gap-2 rounded-md p-2 text-xs"
          style={{ backgroundColor: `${tema.alerta}14`, color: tema.alerta }}
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            La meta exige dejar algún pliegue por debajo de 2 mm, que es lo más
            fino que se puede medir con plicómetro. Conviene replantearla.
          </span>
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Reparto proporcional al de hoy sobre {proyeccion.etiqueta}. Es una
        ilustración de la meta: la grasa no se moviliza igual en todos los
        sitios, así que el reparto real va a diferir.
      </p>

      {señalado && (
        <p className="sr-only" aria-live="polite">
          {señalado.etiqueta}: de {señalado.actualMm} a {señalado.objetivoMm} mm
        </p>
      )}
    </div>
  );
}

function Torta({
  titulo,
  suma,
  segmentos,
  idBase,
  activo,
  onActivo,
  tema,
  conMargen,
  destacado = false,
}: {
  titulo: string;
  suma: number;
  segmentos: Segmento[];
  idBase: string;
  activo: string | null;
  onActivo: (campo: string | null) => void;
  tema: TemaComposicion;
  /** Si el margen se pinta rayado (meta) o sólido como el resto (hoy). */
  conMargen: boolean;
  destacado?: boolean;
}) {
  const señalado = segmentos.find((s) => s.gajo.campo === activo)?.gajo ?? null;

  return (
    <div>
      <p className="text-center text-xs font-medium text-muted-foreground">
        {titulo}
      </p>
      <div className="relative h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {segmentos
                .filter((segmento) => segmento.esMargen)
                .map((segmento) => (
                  <pattern
                    key={segmento.clave}
                    id={`${idBase}-${segmento.gajo.campo}`}
                    patternUnits="userSpaceOnUse"
                    width={6}
                    height={6}
                    patternTransform="rotate(45)"
                  >
                    <rect width={6} height={6} fill={tema.superficie} />
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={6}
                      stroke={segmento.gajo.color}
                      strokeWidth={3}
                    />
                  </pattern>
                ))}
            </defs>
            <Pie
              data={segmentos}
              dataKey="valor"
              nameKey="clave"
              cx="50%"
              cy="50%"
              innerRadius="54%"
              outerRadius="88%"
              startAngle={90}
              endAngle={-270}
              stroke={tema.superficie}
              strokeWidth={1}
              onMouseEnter={(_, indice: number) =>
                onActivo(segmentos[indice]?.gajo.campo ?? null)
              }
              onMouseLeave={() => onActivo(null)}
              isAnimationActive={false}
            >
              {segmentos.map((segmento) => (
                <Cell
                  key={segmento.clave}
                  fill={
                    segmento.esMargen && conMargen
                      ? `url(#${idBase}-${segmento.gajo.campo})`
                      : segmento.gajo.color
                  }
                  opacity={
                    activo == null || activo === segmento.gajo.campo ? 1 : 0.3
                  }
                  style={{ transition: "opacity 150ms ease" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {señalado ? (
            <>
              <span
                className="max-w-[6.5rem] text-[11px] leading-tight"
                style={{ color: tema.tinta }}
              >
                {señalado.etiqueta}
              </span>
              <span className="text-xl font-bold tabular-nums">
                {formatearMedida(
                  conMargen ? señalado.objetivoMm : señalado.actualMm,
                )}
                <span className="ml-0.5 text-xs font-normal">mm</span>
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px]" style={{ color: tema.tintaSuave }}>
                Σ pliegues
              </span>
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  destacado && "text-primary",
                )}
              >
                {formatearMedida(suma)}
                <span className="ml-0.5 text-xs font-normal">mm</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

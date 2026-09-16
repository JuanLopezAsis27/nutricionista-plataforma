"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import {
  METODOS_GRASA,
  DEFINICIONES_METODO,
} from "@/dominio/servicios/grasaPorPliegues";
import { formatearFecha, formatearMedida } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import {
  MASAS,
  ETIQUETAS_MASA,
  estiloTooltip,
  colorDeEcuacion,
  type ClaveMasa,
  type TemaComposicion,
} from "./paleta";

type Modo = "APILADO" | "AGRUPADO";

/** Radio de la punta de barra, según el sistema de marcas. */
const PUNTA: [number, number, number, number] = [4, 4, 0, 0];

interface PuntoEvolucion {
  fecha: string;
  muscular: number | null;
  adiposa: number | null;
  osea: number | null;
  residual: number | null;
  piel: number | null;
}

/**
 * Evolución de las cinco masas, consulta por consulta.
 *
 * Barras y no líneas: las mediciones son eventos discretos y espaciados
 * (una por consulta), no una serie continua. Una línea entre dos consultas
 * separadas por dos meses insinúa que el valor pasó por ahí, y no se sabe.
 *
 * Dos lecturas, un solo eje (kg) en las dos:
 *   apilado  — cómo se reparte el peso total y cómo cambia el reparto;
 *   agrupado — el recorrido de cada masa por su cuenta, que es donde se ve
 *              el caso interesante: adiposa que baja mientras la muscular sube.
 */
export function EvolucionMasas({
  mediciones,
  tema,
}: {
  mediciones: MedicionComposicionDto[];
  tema: TemaComposicion;
}) {
  const [modo, setModo] = useState<Modo>("AGRUPADO");

  const puntos: PuntoEvolucion[] = mediciones
    .filter((m) => m.resultado.fraccionamiento != null)
    .map((m) => {
      const f = m.resultado.fraccionamiento!;
      return {
        fecha: formatearFecha(m.fecha),
        muscular: f.muscular.kg,
        adiposa: f.adiposa.kg,
        osea: f.osea.kg,
        residual: f.residual.kg,
        piel: f.piel.kg,
      };
    });

  if (puntos.length < 2) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Con dos mediciones completas vas a ver cómo evoluciona cada masa.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {MASAS.map((clave) => (
            <li key={clave} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: tema.masas[clave] }}
              />
              {ETIQUETAS_MASA[clave]}
            </li>
          ))}
        </ul>
        <div className="flex gap-1 rounded-md border p-0.5">
          <Button
            variant={modo === "AGRUPADO" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setModo("AGRUPADO")}
          >
            Por masa
          </Button>
          <Button
            variant={modo === "APILADO" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setModo("APILADO")}
          >
            Apilado
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={puntos}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid
            stroke={tema.grilla}
            strokeWidth={1}
            vertical={false}
          />
          <XAxis
            dataKey="fecha"
            tick={{ fill: tema.tinta, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: tema.eje }}
            minTickGap={12}
          />
          <YAxis
            width={48}
            tick={{ fill: tema.tinta, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            unit=" kg"
          />
          <Tooltip
            cursor={{ fill: tema.grilla, fillOpacity: 0.35 }}
            contentStyle={estiloTooltip(tema)}
            formatter={(valor, nombre) => [
              `${formatearMedida(valor as number)} kg`,
              ETIQUETAS_MASA[nombre as ClaveMasa] ?? String(nombre),
            ]}
          />
          {/* El orden de apilado es el orden fijo de la paleta. */}
          {MASAS.map((clave, indice) => (
            <Bar
              key={clave}
              dataKey={clave}
              stackId={modo === "APILADO" ? "masas" : undefined}
              fill={tema.masas[clave]}
              // En apilado, el hueco de 2px entre segmentos lo da el borde del
              // color de superficie; solo la barra de arriba lleva punta.
              stroke={modo === "APILADO" ? tema.superficie : undefined}
              strokeWidth={modo === "APILADO" ? 2 : 0}
              radius={
                modo === "AGRUPADO" || indice === MASAS.length - 1
                  ? PUNTA
                  : undefined
              }
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Score-Z Phantom de cada masa a lo largo del tiempo.
 * El 0 es el humano de referencia: cruzarlo hacia arriba o hacia abajo es la
 * lectura que le importa al profesional, y por eso lleva línea marcada. Las
 * barras salen de esa línea, hacia arriba o hacia abajo según el signo.
 */
export function EvolucionScoreZ({
  mediciones,
  tema,
}: {
  mediciones: MedicionComposicionDto[];
  tema: TemaComposicion;
}) {
  const puntos = mediciones
    .filter((m) => m.resultado.fraccionamiento != null)
    .map((m) => {
      const f = m.resultado.fraccionamiento!;
      return {
        fecha: formatearFecha(m.fecha),
        muscular: f.muscular.scoreZ,
        adiposa: f.adiposa.scoreZ,
        osea: f.osea.scoreZ,
        residual: f.residual.scoreZ,
      };
    });

  if (puntos.length < 2) return null;

  const conScoreZ = MASAS.filter((clave) => clave !== "piel");

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={puntos}
        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        barGap={2}
        barCategoryGap="20%"
      >
        <CartesianGrid stroke={tema.grilla} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="fecha"
          tick={{ fill: tema.tinta, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={12}
        />
        <YAxis
          width={36}
          domain={[-4, 4]}
          ticks={[-4, -2, 0, 2, 4]}
          tick={{ fill: tema.tinta, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceLine
          y={0}
          stroke={tema.eje}
          strokeWidth={2}
          label={{
            value: "Phantom",
            position: "insideTopRight",
            fill: tema.tintaSuave,
            fontSize: 10,
          }}
        />
        <Tooltip
          cursor={{ fill: tema.grilla, fillOpacity: 0.35 }}
          contentStyle={estiloTooltip(tema)}
          formatter={(valor, nombre) => [
            `${formatearMedida(valor as number)} DE`,
            ETIQUETAS_MASA[nombre as ClaveMasa] ?? String(nombre),
          ]}
        />
        {conScoreZ.map((clave) => (
          <Bar
            key={clave}
            dataKey={clave}
            fill={tema.masas[clave]}
            radius={PUNTA}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Evolución del porcentaje graso (modelo de 2 componentes), como línea de
 * tiempo.
 *
 * Es el único gráfico de esta pantalla que va en LÍNEAS y no en barras, y la
 * razón es que acá el eje X es tiempo de verdad: cada punto se ubica en su
 * fecha —no en una ranura de igual ancho—, así que la pendiente entre dos
 * consultas es la velocidad real del cambio y dos meses de hueco se ven como
 * dos meses de hueco. Es la misma forma que ya usa el PDF para esta serie.
 *
 * Dibuja UNA ecuación o TODAS a la vez, y las dos lecturas son distintas:
 *
 *   una    — el seguimiento: la misma fórmula de punta a punta, que es lo
 *            único que mide progreso y no cambio de fórmula;
 *   todas  — la dispersión entre ecuaciones. Cada una se validó en otra
 *            población y da otro número para el mismo paciente: ver el ancho
 *            de la banda —y que se mueva entera— es lo que dice si la bajada
 *            es del paciente o de la fórmula elegida.
 *
 * Las series NUNCA se promedian ni se mezclan en una sola línea, y el color de
 * cada ecuación sale de su índice en `METODOS_GRASA`: filtrar a una sola no
 * repinta a las que quedan.
 */
export function EvolucionGrasa({
  mediciones,
  metodos,
  tema,
}: {
  mediciones: MedicionComposicionDto[];
  /** Ecuaciones a dibujar. Una sola para seguir; todas para comparar. */
  metodos: MetodoGrasa[];
  tema: TemaComposicion;
}) {
  // En el orden del enum y sin repetidos: es el orden de la leyenda, y el que
  // hace que el color de una ecuación sea siempre el mismo.
  const series = METODOS_GRASA.filter((metodo) => metodos.includes(metodo));

  const puntos: PuntoGrasa[] = mediciones
    .map((medicion) => {
      const punto: PuntoGrasa = { tiempo: new Date(medicion.fecha).getTime() };
      for (const metodo of series) {
        const resultado = medicion.resultado.grasaPorPliegues.resultados.find(
          (r) => r.metodo === metodo,
        );
        // `null` y no ausente: recharts corta la línea en el hueco, que es lo
        // correcto — esa consulta no resolvió esta ecuación, y unirla con la
        // siguiente insinuaría un valor que nadie midió.
        punto[metodo] = resultado?.porcentajeGrasa ?? null;
        punto[claveKg(metodo)] = resultado?.masaGrasaKg ?? null;
      }
      return punto;
    })
    // Una consulta sin NINGUNA de estas ecuaciones resuelta no entra: aportaría
    // una marca en el eje de tiempo sin nada dibujado encima, y alargaría el
    // eje hasta una fecha que esta serie no alcanza.
    .filter((punto) => series.some((metodo) => punto[metodo] != null));

  const conDato = series.filter((metodo) =>
    puntos.some((punto) => punto[metodo] != null),
  );
  const medidos = conDato.flatMap((metodo) =>
    puntos
      .map((punto) => punto[metodo])
      .filter((valor): valor is number => valor != null),
  );

  // El corte es por FECHAS, no por valores: seis ecuaciones de una sola
  // consulta son seis puntos, y seis puntos apilados sobre la misma fecha no
  // son una evolución.
  if (puntos.length < 2) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Con dos mediciones que resuelvan estas ecuaciones vas a ver la
        evolución.
      </p>
    );
  }

  // Eje recortado y no desde cero: son líneas, y lo que se lee es el recorrido
  // de un puñado de puntos entre 10 % y 30 %. Desde cero, ese recorrido queda
  // aplastado contra el techo y el cambio de la consulta no se ve.
  const minimo = Math.floor(Math.min(...medidos) - 1);
  const maximo = Math.ceil(Math.max(...medidos) + 1);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={puntos}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke={tema.grilla}
            strokeWidth={1}
            vertical={false}
          />
          {/* Eje de TIEMPO, no de categorías: las marcas van en las fechas que
              se midieron, pero separadas por lo que separa a las consultas. */}
          <XAxis
            dataKey="tiempo"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={puntos.map((punto) => punto.tiempo)}
            tickFormatter={(valor: number) => formatearFecha(new Date(valor))}
            tick={{ fill: tema.tinta, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: tema.eje }}
            minTickGap={16}
          />
          <YAxis
            width={44}
            domain={[minimo, maximo]}
            tick={{ fill: tema.tinta, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            unit=" %"
          />
          <Tooltip
            cursor={{ stroke: tema.eje, strokeWidth: 1 }}
            content={<TooltipGrasa tema={tema} />}
          />
          {conDato.map((metodo) => {
            const color = colorDeEcuacion(tema, METODOS_GRASA.indexOf(metodo));
            return (
              <Line
                key={metodo}
                type="linear"
                dataKey={metodo}
                name={DEFINICIONES_METODO[metodo].etiqueta}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                // El anillo del color de la superficie es lo que deja legible
                // un punto donde dos ecuaciones se cruzan.
                dot={{
                  r: 4,
                  fill: color,
                  stroke: tema.superficie,
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: color,
                  stroke: tema.superficie,
                  strokeWidth: 2,
                }}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* La leyenda lleva el ÚLTIMO valor de cada ecuación escrito al lado, y
          no es decoración: tres de los seis tonos de la paleta no llegan a 3:1
          contra la superficie clara, así que el número tiene que estar en
          texto y no solo en el color de una línea de 2px. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 text-xs">
        {conDato.map((metodo) => {
          const ultimo = [...puntos]
            .reverse()
            .find((punto) => punto[metodo] != null);
          return (
            <li key={metodo} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full"
                style={{
                  backgroundColor: colorDeEcuacion(
                    tema,
                    METODOS_GRASA.indexOf(metodo),
                  ),
                }}
              />
              <span className="text-muted-foreground">
                {DEFINICIONES_METODO[metodo].etiqueta}
              </span>
              <span className="font-medium tabular-nums">
                {formatearMedida(ultimo?.[metodo])} %
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Una consulta de la serie de grasa: el % de cada ecuación y sus kg de grasa.
 *
 * Las claves son los nombres de los métodos porque es lo que recharts pide
 * como `dataKey`; los kg van con sufijo (`claveKg`) para que el tooltip los
 * encuentre sin una segunda estructura en paralelo que haya que mantener
 * alineada con esta.
 */
interface PuntoGrasa {
  tiempo: number;
  [clave: string]: number | null;
}

function claveKg(metodo: MetodoGrasa): string {
  return `${metodo}__kg`;
}

/**
 * Tooltip de la serie: la fecha arriba y TODAS las ecuaciones que esa consulta
 * resolvió, con el valor adelante y el nombre detrás.
 *
 * Lista todas y no solo la línea señalada: con seis ecuaciones que corren
 * casi pegadas, apuntarle a una sola es imposible, y lo que se viene a leer
 * es justamente la distancia entre ellas.
 */
function TooltipGrasa({
  active,
  payload,
  label,
  tema,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; color?: string; payload?: unknown }[];
  label?: number;
  tema: TemaComposicion;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const fila = (payload[0]?.payload ?? { tiempo: 0 }) as PuntoGrasa;

  return (
    <div style={{ ...estiloTooltip(tema), padding: "6px 10px" }}>
      <p style={{ color: tema.tintaSuave, marginBottom: 4 }}>
        {formatearFecha(new Date(label ?? fila.tiempo))}
      </p>
      {payload.map((item) => {
        const metodo = item.dataKey as MetodoGrasa | undefined;
        if (metodo == null || fila[metodo] == null) return null;
        const kg = fila[claveKg(metodo)];
        return (
          <p
            key={metodo}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              aria-hidden
              style={{
                width: 12,
                height: 2,
                borderRadius: 999,
                backgroundColor: item.color,
              }}
            />
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatearMedida(fila[metodo])} %
            </strong>
            {kg != null && (
              <span style={{ color: tema.tintaSuave }}>
                · {formatearMedida(kg)} kg
              </span>
            )}
            <span style={{ color: tema.tintaSuave }}>
              {DEFINICIONES_METODO[metodo].etiqueta}
            </span>
          </p>
        );
      })}
    </div>
  );
}

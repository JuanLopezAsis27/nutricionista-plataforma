"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import { formatearFecha, formatearMedida } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import {
  MASAS,
  ETIQUETAS_MASA,
  estiloTooltip,
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
 * Evolución del porcentaje graso (modelo de 2 componentes).
 *
 * Una barra por consulta, SIEMPRE de la misma ecuación: comparar un valor de
 * Yuhasz contra uno de Durnin & Womersley no mide progreso, mide el cambio de
 * fórmula. Por eso el método es un selector explícito y no "el destacado de
 * cada medición".
 */
export function EvolucionGrasa({
  mediciones,
  metodo,
  tema,
}: {
  mediciones: MedicionComposicionDto[];
  metodo: MetodoGrasa;
  tema: TemaComposicion;
}) {
  const puntos = mediciones
    .map((m) => {
      const resultado = m.resultado.grasaPorPliegues.resultados.find(
        (r) => r.metodo === metodo,
      );
      return resultado
        ? {
            fecha: formatearFecha(m.fecha),
            porcentaje: resultado.porcentajeGrasa,
            masaGrasa: resultado.masaGrasaKg,
            masaMagra: resultado.masaLibreGrasaKg,
          }
        : null;
    })
    .filter((punto): punto is NonNullable<typeof punto> => punto != null);

  if (puntos.length < 2) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Con dos mediciones que resuelvan esta ecuación vas a ver la evolución.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={puntos}
        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid stroke={tema.grilla} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="fecha"
          tick={{ fill: tema.tinta, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: tema.eje }}
          minTickGap={12}
        />
        <YAxis
          width={44}
          tick={{ fill: tema.tinta, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit=" %"
        />
        <Tooltip
          cursor={{ fill: tema.grilla, fillOpacity: 0.35 }}
          contentStyle={estiloTooltip(tema)}
          formatter={(valor, _nombre, item) => [
            `${formatearMedida(valor as number)} % · ${formatearMedida(
              (item?.payload as { masaGrasa: number } | undefined)?.masaGrasa,
            )} kg de grasa`,
            "Porcentaje graso",
          ]}
        />
        <Bar
          dataKey="porcentaje"
          fill={tema.masas.adiposa}
          radius={PUNTA}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

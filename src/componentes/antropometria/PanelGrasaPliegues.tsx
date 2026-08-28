"use client";

import { Info } from "lucide-react";
import type { GrasaPorPliegues } from "@/dominio/servicios/grasaPorPliegues";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import { formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import type { TemaComposicion } from "./paleta";

/**
 * Modelo de 2 componentes: el porcentaje graso por cada ecuación de pliegues.
 *
 * Se muestran TODAS las que las medidas resuelven, no solo la destacada: ver
 * la dispersión entre ecuaciones es parte de la lectura clínica. La destacada
 * va grande arriba; el resto, como contraste, en una lista compacta.
 *
 * Cada fila lleva la población en la que se validó la ecuación, porque
 * aplicar la de deportistas a un sedentario (o al revés) es el error más
 * común de este modelo.
 */
export function PanelGrasaPliegues({
  grasa,
  metodoDestacado,
  anterior,
  pesoKg,
  tema,
}: {
  grasa: GrasaPorPliegues;
  /** Ecuación elegida en la medición; si es null se usa la primera. */
  metodoDestacado: MetodoGrasa | null;
  /** Resultados de la medición anterior, para la diferencia. */
  anterior?: GrasaPorPliegues | null;
  pesoKg: number;
  tema: TemaComposicion;
}) {
  if (grasa.resultados.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Todavía no se puede estimar el porcentaje graso.
        </p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {grasa.faltantes.map((falta) => (
            <li key={falta.metodo}>
              <span className="font-medium">{falta.etiqueta}:</span> falta{" "}
              {falta.campos.join(", ").toLowerCase()}.
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const destacado =
    grasa.resultados.find((r) => r.metodo === metodoDestacado) ??
    grasa.resultados[0]!;
  const otros = grasa.resultados.filter((r) => r.metodo !== destacado.metodo);
  const previo =
    anterior?.resultados.find((r) => r.metodo === destacado.metodo) ?? null;
  const diferencia =
    previo != null
      ? Math.round((destacado.porcentajeGrasa - previo.porcentajeGrasa) * 100) /
        100
      : null;

  return (
    <div className="space-y-4">
      {/* Cifra principal: la ecuación elegida para esta consulta. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {destacado.etiqueta}
          </p>
          <p className="mt-0.5 text-4xl font-bold tabular-nums">
            {formatearNumero(destacado.porcentajeGrasa)}
            <span className="ml-1 text-lg font-normal text-muted-foreground">
              %
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {formatearNumero(destacado.masaGrasaKg)} kg de grasa ·{" "}
            {formatearNumero(destacado.masaLibreGrasaKg)} kg de masa magra
          </p>
          {diferencia != null && (
            <p
              className="mt-0.5 text-sm font-medium tabular-nums"
              style={{ color: diferencia <= 0 ? tema.bien : tema.atencion }}
            >
              {diferencia > 0 ? "+" : ""}
              {formatearNumero(diferencia)} puntos vs. la medición anterior
            </p>
          )}
        </div>

        {/* Reparto grasa / magra sobre el peso, como barra única. */}
        <div className="min-w-[14rem] flex-1 space-y-1">
          <div className="flex h-6 w-full overflow-hidden rounded-md">
            <span
              className="flex items-center justify-center text-[10px] font-semibold text-white"
              style={{
                width: `${destacado.porcentajeGrasa}%`,
                backgroundColor: tema.masas.adiposa,
              }}
            >
              {destacado.porcentajeGrasa >= 12 &&
                `${formatearNumero(destacado.porcentajeGrasa)} %`}
            </span>
            <span
              className="flex flex-1 items-center justify-center text-[10px] font-semibold text-white"
              style={{ backgroundColor: tema.masas.muscular }}
            >
              {formatearNumero(100 - destacado.porcentajeGrasa)} %
            </span>
          </div>
          <p className="flex justify-between text-[11px] text-muted-foreground">
            <span>Masa grasa</span>
            <span>
              Masa libre de grasa · {formatearNumero(pesoKg)} kg totales
            </span>
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-medium">{destacado.autor}.</span> Validada en:{" "}
        {destacado.poblacion}. Σ pliegues del método:{" "}
        {formatearNumero(destacado.sumatoriaPliegues)} mm
        {destacado.densidadCorporal != null &&
          ` · densidad ${formatearNumero(destacado.densidadCorporal)} g/ml`}
        .
      </p>

      {otros.length > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Otras ecuaciones sobre las mismas medidas
          </p>
          <ul className="space-y-1">
            {otros.map((resultado) => (
              <li
                key={resultado.metodo}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="truncate">{resultado.etiqueta}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {resultado.poblacion}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatearNumero(resultado.porcentajeGrasa)} %
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {formatearNumero(resultado.masaGrasaKg)} kg
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {grasa.faltantes.length > 0 && (
        <p className="flex items-start gap-1.5 border-t pt-3 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>
            Sin calcular por falta de medidas:{" "}
            {grasa.faltantes
              .map(
                (falta) =>
                  `${falta.etiqueta} (${falta.campos.join(", ").toLowerCase()})`,
              )
              .join(" · ")}
            .
          </span>
        </p>
      )}
    </div>
  );
}

/** Comparación honesta entre los dos modelos, cuando conviven. */
export function AvisoDosModelos({
  masaAdiposaKg,
  porcentajeAdiposa,
  masaGrasaKg,
  porcentajeGrasa,
  etiquetaMetodo,
}: {
  masaAdiposaKg: number;
  porcentajeAdiposa: number;
  masaGrasaKg: number;
  porcentajeGrasa: number;
  etiquetaMetodo: string;
}) {
  const brecha = Math.abs(masaAdiposaKg - masaGrasaKg);

  return (
    <div className="flex gap-3 rounded-md border border-dashed p-3 text-xs">
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="space-y-1">
        <p>
          Esta medición resuelve los dos modelos:{" "}
          <span className="font-medium tabular-nums">
            {formatearNumero(masaAdiposaKg)} kg (
            {formatearNumero(porcentajeAdiposa)} %)
          </span>{" "}
          de masa adiposa por Kerr, y{" "}
          <span className="font-medium tabular-nums">
            {formatearNumero(masaGrasaKg)} kg (
            {formatearNumero(porcentajeGrasa)} %)
          </span>{" "}
          de masa grasa por {etiquetaMetodo}.
        </p>
        <p className="text-muted-foreground">
          Los{" "}
          <span className={cn("font-medium")}>
            {formatearNumero(brecha)} kg
          </span>{" "}
          de diferencia no son un error: Kerr es un modelo anatómico y mide
          grasa subcutánea; las ecuaciones de pliegues estiman grasa total por
          densitometría. Seguí uno u otro a lo largo del tiempo, nunca los dos
          en la misma serie.
        </p>
      </div>
    </div>
  );
}

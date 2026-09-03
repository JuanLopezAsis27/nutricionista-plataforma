"use client";

import { useState } from "react";
import { ChevronDown, Repeat2, Target, Utensils } from "lucide-react";
import {
  DIAS_SEMANA,
  ETIQUETA_DIA,
  ETIQUETA_DIA_LARGA,
  diaSemanaDe,
  type DiaSemana,
} from "@/dominio/entidades/PlanSemanal";
import type {
  PlanSemanalSalidaDto,
  DiaComparadoDto,
  MacrosDto,
} from "@/aplicacion/dtos/planSemanal.dto";
import { cn } from "@/lib/utilidades";
import { Badge } from "@/componentes/ui/badge";
import {
  estiloDeFranja,
  COLOR_ESTADO_META,
} from "@/componentes/comunes/paletaFranjas";
import {
  textoDeComida,
  macrosEnLinea,
  type ComidaSemanalSalida,
} from "./textoComida";

interface Props {
  plan: PlanSemanalSalidaDto;
  dias?: DiaComparadoDto[];
  metas?: MacrosDto | null;
  /** Día que se muestra al abrir; por defecto, hoy. */
  diaInicial?: DiaSemana;
}

/**
 * El menú de la semana como lo lee el PACIENTE: un día por vez.
 *
 * No es la grilla de siete columnas del consultorio. El profesional arma la
 * semana entera y necesita verla junta para repartir los macros; el paciente
 * abre la app para saber qué come hoy, y una tabla de 42 celdas —que en un
 * teléfono se barre de costado— es exactamente lo contrario de esa pregunta.
 * Por eso acá el día es un selector y la semana se recorre tocando.
 *
 * Muestra la comida principal de cada franja y, plegadas, sus alternativas:
 * son intercambiables entre sí, no cosas que haya que comer todas, y abrirlas
 * de entrada haría que un día con opciones pareciera un día con el triple de
 * comida.
 */
export function VistaSemanaPaciente({ plan, dias, metas, diaInicial }: Props) {
  const [dia, setDia] = useState<DiaSemana>(
    () => diaInicial ?? diaSemanaDe(new Date()),
  );
  const hoy = diaSemanaDe(new Date());

  const total = plan.totalesPorDia.find((t) => t.dia === dia)?.macros;
  const comparacion = dias?.find((d) => d.dia === dia);

  // Solo las franjas que ese día tienen algo cargado: una fila vacía en la
  // grilla del profesional es una celda con un guion, pero acá sería una
  // tarjeta entera diciendo que no hay nada.
  const franjasDelDia = plan.franjas
    .map((franja, indice) => ({
      franja,
      indice,
      comidas: franja.comidas
        .filter((comida) => comida.dia === dia)
        .sort((a, b) => a.orden - b.orden),
    }))
    .filter((fila) => fila.comidas.length > 0);

  return (
    <div className="space-y-4">
      {/* Selector de día. En mobile se barre de costado; de sm para arriba los
          siete entran repartidos. */}
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label="Día de la semana"
      >
        {DIAS_SEMANA.map((candidato) => {
          const activo = candidato === dia;
          const esHoy = candidato === hoy;
          return (
            <button
              key={candidato}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => setDia(candidato)}
              className={cn(
                "flex min-w-[3.25rem] flex-1 flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-xs font-semibold uppercase transition-colors",
                activo
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {ETIQUETA_DIA[candidato]}
              {/* «Hoy» se dice con la palabra, no solo con el color: el color
                  solo no lo ve todo el mundo. */}
              <span
                className={cn(
                  "text-[0.6rem] font-normal normal-case",
                  activo ? "text-primary-foreground/80" : "text-primary",
                )}
              >
                {esHoy ? "hoy" : " "}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold">{ETIQUETA_DIA_LARGA[dia]}</h3>
        <TotalDelDia macros={total} comparacion={comparacion} />
      </div>

      {franjasDelDia.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Utensils className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="pt-2 text-sm text-muted-foreground">
            Tu nutricionista todavía no cargó comidas para el{" "}
            {ETIQUETA_DIA_LARGA[dia].toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {franjasDelDia.map(({ franja, indice, comidas }) => (
            <TarjetaFranja
              key={franja.id}
              nombre={franja.nombre}
              horaDesde={franja.horaDesde}
              horaHasta={franja.horaHasta}
              indice={indice}
              comidas={comidas}
            />
          ))}
        </div>
      )}

      {dias && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {metas
            ? `El total del día se compara con tu meta diaria: ${metasEnTexto(metas)}.`
            : "Tu plan no tiene metas de macros cargadas, así que el total va sin comparar."}
        </p>
      )}
    </div>
  );
}

/** Una franja del día: la comida principal arriba y las alternativas plegadas. */
function TarjetaFranja({
  nombre,
  horaDesde,
  horaHasta,
  indice,
  comidas,
}: {
  nombre: string;
  horaDesde: string | null;
  horaHasta: string | null;
  indice: number;
  comidas: ComidaSemanalSalida[];
}) {
  const [abierto, setAbierto] = useState(false);
  const estilo = estiloDeFranja(indice);
  const principal = comidas[0]!;
  const alternativas = comidas.slice(1);
  const macros = macrosEnLinea(principal.macros);

  return (
    <div className={cn("overflow-hidden rounded-xl border", estilo.celda)}>
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-3 py-2",
          estilo.rotulo,
        )}
      >
        <span className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", estilo.punto)} />
          <span className={cn("text-sm font-semibold", estilo.texto)}>
            {nombre}
          </span>
        </span>
        {(horaDesde || horaHasta) && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {horaDesde}
            {horaHasta ? ` – ${horaHasta}` : ""}
          </span>
        )}
      </div>

      <div className="bg-card p-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {textoDeComida(principal)}
        </p>
        {principal.recetaNombre && principal.descripcion?.trim() && (
          <p className="pt-1 text-xs text-muted-foreground">
            Receta: {principal.recetaNombre}
          </p>
        )}
        {macros && (
          <p className="pt-1.5 text-xs tabular-nums text-muted-foreground">
            {macros}
          </p>
        )}

        {alternativas.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setAbierto((previo) => !previo)}
              aria-expanded={abierto}
              className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-primary"
            >
              <Repeat2 className="h-3.5 w-3.5" />
              {abierto
                ? "Ocultar alternativas"
                : alternativas.length === 1
                  ? "O cambiala por otra opción"
                  : `O cambiala por una de ${alternativas.length} opciones`}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  abierto && "rotate-180",
                )}
              />
            </button>
            {abierto && (
              <ul className="mt-2 space-y-2">
                {alternativas.map((alternativa) => {
                  const suyos = macrosEnLinea(alternativa.macros);
                  return (
                    <li
                      key={alternativa.id}
                      className="rounded-lg border border-dashed p-2.5"
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {textoDeComida(alternativa)}
                      </p>
                      {suyos && (
                        <p className="pt-1 text-xs tabular-nums text-muted-foreground">
                          {suyos}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * El total del día, con el semáforo de calorías cuando hay meta contra qué
 * medirlo. El color va siempre acompañado del número y su signo.
 */
function TotalDelDia({
  macros,
  comparacion,
}: {
  macros: MacrosDto | undefined;
  comparacion: DiaComparadoDto | undefined;
}) {
  if (!macros || macros.calorias == null) return null;
  const calorias = comparacion?.comparacion.calorias;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold tabular-nums">
        {macros.calorias} kcal
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {[
          macros.proteinasG != null && `${macros.proteinasG} P`,
          macros.carbohidratosG != null && `${macros.carbohidratosG} C`,
          macros.grasasG != null && `${macros.grasasG} G`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
      {calorias &&
        calorias.estado !== "SIN_META" &&
        calorias.estado !== "SIN_DATO" && (
          <Badge
            variant="outline"
            className={cn("text-[0.65rem]", COLOR_ESTADO_META[calorias.estado])}
          >
            {calorias.estado === "EN_RANGO"
              ? "en tu meta"
              : `${(calorias.diferencia ?? 0) > 0 ? "+" : ""}${Math.round(calorias.diferencia ?? 0)} kcal`}
          </Badge>
        )}
    </span>
  );
}

function metasEnTexto(metas: MacrosDto): string {
  return (
    [
      metas.calorias != null && `${metas.calorias} kcal`,
      metas.proteinasG != null && `${metas.proteinasG} g de proteínas`,
      metas.carbohidratosG != null &&
        `${metas.carbohidratosG} g de carbohidratos`,
      metas.grasasG != null && `${metas.grasasG} g de grasas`,
    ]
      .filter(Boolean)
      .join(" · ") || "sin valores"
  );
}

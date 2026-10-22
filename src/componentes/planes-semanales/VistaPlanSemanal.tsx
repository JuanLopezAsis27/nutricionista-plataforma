"use client";

import { DIAS_SEMANA, ETIQUETA_DIA } from "@/dominio/entidades/PlanSemanal";
import type {
  PlanSemanalSalidaDto,
  DiaComparadoDto,
  MacrosDto,
} from "@/aplicacion/dtos/planSemanal.dto";
import { Badge } from "@/componentes/ui/badge";
import {
  estiloDeFranja,
  COLOR_ESTADO_META,
} from "@/componentes/comunes/paletaFranjas";
import { textoDeComida } from "./textoComida";
import { ComparativaSemanal } from "./ComparativaSemanal";
import { descripcionDeMetas } from "./metas";

interface Props {
  plan: PlanSemanalSalidaDto;
}

/**
 * El plan semanal como se lee: la grilla de franjas × días, con la comida
 * principal de cada celda y sus alternativas debajo, y el total de cada día.
 *
 * Cada total lleva el desvío contra la meta de ESE día, que es del plan
 * semanal (migración 91): las mismas toda la semana o unas por día. Como las
 * metas viajan con el plan, la comparación se ve igual en la página del plan,
 * en la ficha del paciente y en su portal.
 */
export function VistaPlanSemanal({ plan }: Props) {
  const comparacionPorDia = new Map(plan.dias.map((dia) => [dia.dia, dia]));
  const totalPorDia = new Map(
    plan.totalesPorDia.map((total) => [total.dia, total.macros]),
  );

  return (
    <div className="space-y-3">
      {plan.descripcion && (
        <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {descripcionDeMetas(plan.metas)}
      </p>
      {/* A lo ancho: en pantallas grandes los siete días se reparten el
          espacio y entran sin scroll (`lg:table-fixed`). En mobile eso daría
          columnas de 40 px ilegibles, así que ahí la grilla conserva su ancho
          mínimo y se barre de costado —una semana no entra en 375 px, y
          fingir que sí la vuelve inservible—. */}
      <div className="overflow-x-auto lg:overflow-x-visible">
        <table className="w-full min-w-[56rem] border-separate border-spacing-1 text-sm lg:min-w-0 lg:table-fixed">
          <thead>
            <tr>
              <th className="w-[7.5rem] text-left text-xs font-medium text-muted-foreground">
                Franja
              </th>
              {DIAS_SEMANA.map((dia) => (
                <th
                  key={dia}
                  className="text-center text-xs font-medium uppercase text-muted-foreground"
                >
                  {ETIQUETA_DIA[dia]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.franjas.map((franja, indiceFranja) => {
              // Mismo color que en el editor, y por el mismo criterio: la
              // posición de la franja (ver paletaFranjas).
              const estilo = estiloDeFranja(indiceFranja);
              return (
                <tr key={franja.id} className="align-top">
                  <th
                    className={`rounded-md border px-2 py-2 text-left align-middle ${estilo.rotulo}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${estilo.punto}`}
                      />
                      <span className={`text-sm font-semibold ${estilo.texto}`}>
                        {franja.nombre}
                      </span>
                    </span>
                    {(franja.horaDesde || franja.horaHasta) && (
                      <span className="block pl-3.5 text-xs font-normal text-muted-foreground">
                        {franja.horaDesde}
                        {franja.horaHasta ? ` – ${franja.horaHasta}` : ""}
                      </span>
                    )}
                  </th>
                  {DIAS_SEMANA.map((dia) => {
                    const comidas = franja.comidas.filter((c) => c.dia === dia);
                    return (
                      <td key={dia} className="p-0 align-top">
                        <div
                          className={`h-full space-y-1 rounded-md border p-1.5 ${estilo.celda}`}
                        >
                          {comidas.length === 0 ? (
                            <p className="px-1 py-2 text-center text-xs text-muted-foreground">
                              —
                            </p>
                          ) : (
                            comidas.map((comida, posicion) => (
                              <div
                                key={comida.id}
                                className={
                                  posicion === 0
                                    ? `rounded-sm p-1.5 ${estilo.principal}`
                                    : "rounded-sm border border-dashed p-1.5"
                                }
                              >
                                {posicion > 0 && (
                                  <span className="mb-0.5 block text-[0.6rem] uppercase text-muted-foreground">
                                    Alternativa
                                  </span>
                                )}
                                <p className="text-xs leading-snug">
                                  {textoDeComida(comida)}
                                </p>
                                {comida.macros.calorias != null && (
                                  <span className="text-[0.65rem] text-muted-foreground">
                                    {comida.macros.calorias} kcal
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                Total del día
              </th>
              {DIAS_SEMANA.map((dia) => (
                <td key={dia} className="p-1 text-center">
                  <TotalDelDia
                    macros={totalPorDia.get(dia)}
                    comparacion={comparacionPorDia.get(dia)}
                  />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      {/* La grilla pone el semáforo solo en las calorías. Acá van las cuatro
          macros día por día: dos menús de 2000 kcal pueden repartir las
          proteínas de forma muy distinta. */}
      <div className="rounded-md border p-3">
        <h4 className="pb-2 text-sm font-medium">
          Macros del día contra la meta
        </h4>
        <ComparativaSemanal dias={plan.dias} metas={plan.metas} />
      </div>
    </div>
  );
}

function TotalDelDia({
  macros,
  comparacion,
}: {
  macros: MacrosDto | undefined;
  comparacion: DiaComparadoDto | undefined;
}) {
  if (!macros) return <span className="text-muted-foreground">—</span>;
  const calorias = comparacion?.comparacion.calorias;
  return (
    <div className="space-y-0.5">
      <span className="block text-sm font-medium">
        {macros.calorias != null ? `${macros.calorias} kcal` : "—"}
      </span>
      <span className="block text-[0.65rem] text-muted-foreground">
        {[
          macros.proteinasG != null && `${macros.proteinasG} P`,
          macros.carbohidratosG != null && `${macros.carbohidratosG} C`,
          macros.grasasG != null && `${macros.grasasG} G`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
      {calorias && calorias.estado !== "SIN_META" && (
        <Badge
          variant="outline"
          className={`text-[0.6rem] ${COLOR_ESTADO_META[calorias.estado]}`}
        >
          {leyendaDe(calorias)}
        </Badge>
      )}
    </div>
  );
}

function leyendaDe(
  calorias: DiaComparadoDto["comparacion"]["calorias"],
): string {
  if (calorias.estado === "SIN_DATO") return "sin macros";
  if (calorias.estado === "EN_RANGO") return "en la meta";
  const diferencia = calorias.diferencia ?? 0;
  return `${diferencia > 0 ? "+" : ""}${Math.round(diferencia)} kcal`;
}

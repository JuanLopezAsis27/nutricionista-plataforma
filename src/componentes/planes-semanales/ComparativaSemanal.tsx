"use client";

import { ETIQUETA_DIA } from "@/dominio/entidades/PlanSemanal";
import type {
  DiaComparadoDto,
  MetasPlanSemanalSalidaDto,
} from "@/aplicacion/dtos/planSemanal.dto";
import { COLOR_ESTADO_META } from "@/componentes/comunes/paletaFranjas";
import { MACROS_META, valorDeMeta, type ClaveMacroMeta } from "./metas";

/**
 * El menú de la semana contra las metas del plan, día por día y macro por
 * macro.
 *
 * La grilla ya muestra el total de cada día, pero solo pone el semáforo en las
 * calorías: dos menús de 2000 kcal pueden repartir las proteínas de forma muy
 * distinta, y eso es justamente lo que hay que revisar antes de entregar la
 * semana. Acá están las cuatro columnas.
 *
 * Las metas son DEL PLAN SEMANAL (migración 91). Con las mismas para toda la
 * semana van en una fila arriba; con unas por día, cada celda dice la suya
 * debajo del valor. El desvío y su color los calcula el dominio: esta tabla
 * solo los dibuja.
 *
 * El promedio de la semana va SIN semáforo, a propósito: es un resumen para
 * ver la tendencia, y un promedio dentro de la meta puede estar hecho de días
 * muy por encima y muy por debajo. Lo que se cumple o no se cumple es el día.
 */
export function ComparativaSemanal({
  dias,
  metas,
}: {
  dias: DiaComparadoDto[];
  metas: MetasPlanSemanalSalidaDto;
}) {
  const promedios = promediosDe(dias);
  const generales = metas.modo === "GENERAL" ? metas.general : null;
  const porDia = metas.modo === "POR_DIA";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1.5 pr-2 text-left text-xs font-medium text-muted-foreground">
              Día
            </th>
            {MACROS_META.map((macro) => (
              <th
                key={macro.clave}
                className="py-1.5 pl-2 text-right text-xs font-medium text-muted-foreground"
              >
                {macro.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {generales && (
            <tr className="border-b bg-muted/40">
              <th className="py-1.5 pr-2 text-left text-xs font-medium">
                Meta diaria
              </th>
              {MACROS_META.map((macro) => {
                const valor = generales[macro.clave];
                return (
                  <td
                    key={macro.clave}
                    className="py-1.5 pl-2 text-right text-xs font-medium"
                  >
                    {valor != null
                      ? valorDeMeta(
                          valor,
                          macro.unidad,
                          metas.tipos[macro.clave],
                        )
                      : "—"}
                  </td>
                );
              })}
            </tr>
          )}

          {dias.map((dia) => (
            <tr key={dia.dia} className="border-b last:border-0">
              <th className="py-1.5 pr-2 text-left text-xs font-medium">
                {ETIQUETA_DIA[dia.dia]}
              </th>
              {MACROS_META.map((macro) => (
                <td key={macro.clave} className="py-1.5 pl-2 text-right">
                  <Celda
                    valor={dia.macros[macro.clave]}
                    unidad={macro.unidad}
                    comparacion={dia.comparacion[macro.clave]}
                    conMetaDelDia={porDia}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t">
            <th className="py-1.5 pr-2 text-left text-xs font-medium text-muted-foreground">
              Promedio
            </th>
            {MACROS_META.map((macro) => (
              <td
                key={macro.clave}
                className="py-1.5 pl-2 text-right text-xs text-muted-foreground"
              >
                {promedios[macro.clave] != null
                  ? `${promedios[macro.clave]} ${macro.unidad}`
                  : "—"}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <p className="pt-2 text-xs text-muted-foreground">
        El promedio toma solo los días con macros cargados. Un valor en verde
        cumple su meta: dentro del ±10 % si es aproximada, por encima del piso
        (≥) o por debajo del techo (≤).
      </p>
    </div>
  );
}

function Celda({
  valor,
  unidad,
  comparacion,
  conMetaDelDia,
}: {
  valor: number | null;
  unidad: string;
  comparacion: DiaComparadoDto["comparacion"][ClaveMacroMeta];
  /** Con metas por día, cada celda dice la suya: no hay fila de meta arriba. */
  conMetaDelDia: boolean;
}) {
  const conMeta =
    comparacion.estado !== "SIN_META" && comparacion.estado !== "SIN_DATO";
  return (
    <span className="inline-flex flex-col items-end">
      {valor == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="inline-flex items-baseline justify-end gap-1.5">
          <span className="font-medium">
            {valor} {unidad}
          </span>
          {conMeta && comparacion.diferencia != null && (
            <span
              className={`rounded px-1 text-[0.65rem] ${COLOR_ESTADO_META[comparacion.estado]}`}
            >
              {comparacion.diferencia > 0 ? "+" : ""}
              {comparacion.diferencia}
            </span>
          )}
        </span>
      )}
      {conMetaDelDia && comparacion.meta != null && (
        <span className="text-[0.65rem] text-muted-foreground">
          meta {valorDeMeta(comparacion.meta, unidad, comparacion.tipo)}
        </span>
      )}
    </span>
  );
}

/** Promedio de cada macro sobre los días que tienen ese dato. */
export function promediosDe(
  dias: DiaComparadoDto[],
): Record<ClaveMacroMeta, number | null> {
  const promedios = {} as Record<ClaveMacroMeta, number | null>;
  for (const macro of MACROS_META) {
    const valores = dias
      .map((dia) => dia.macros[macro.clave])
      .filter((valor): valor is number => valor != null);
    promedios[macro.clave] =
      valores.length === 0
        ? null
        : Math.round(
            valores.reduce((total, valor) => total + valor, 0) / valores.length,
          );
  }
  return promedios;
}

"use client";

import { ETIQUETA_DIA } from "@/dominio/entidades/PlanSemanal";
import type {
  DiaComparadoDto,
  MacrosDto,
} from "@/aplicacion/dtos/planSemanal.dto";
import { COLOR_ESTADO_META } from "./paletaFranjas";

/** Las cuatro columnas, en el orden en que se leen en toda la app. */
const MACROS = [
  { clave: "calorias", etiqueta: "Calorías", unidad: "kcal" },
  { clave: "proteinasG", etiqueta: "Proteínas", unidad: "g" },
  { clave: "carbohidratosG", etiqueta: "Carbohidratos", unidad: "g" },
  { clave: "grasasG", etiqueta: "Grasas", unidad: "g" },
] as const;

type ClaveMacro = (typeof MACROS)[number]["clave"];

/**
 * El menú de la semana contra las metas del paciente, día por día y macro por
 * macro.
 *
 * La grilla ya muestra el total de cada día, pero solo pone el semáforo en las
 * calorías: dos menús de 2000 kcal pueden repartir las proteínas de forma muy
 * distinta, y eso es justamente lo que hay que revisar antes de entregar la
 * semana. Acá están las cuatro columnas.
 *
 * Las metas salen del PLAN NUTRICIONAL asignado (ver
 * `ObtenerPlanSemanalDelPaciente`), y el desvío y su color los calcula el
 * dominio: esta tabla solo los dibuja.
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
  metas: MacrosDto | null;
}) {
  const promedios = promediosDe(dias);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1.5 pr-2 text-left text-xs font-medium text-muted-foreground">
              Día
            </th>
            {MACROS.map((macro) => (
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
          {metas && (
            <tr className="border-b bg-muted/40">
              <th className="py-1.5 pr-2 text-left text-xs font-medium">
                Meta diaria
              </th>
              {MACROS.map((macro) => (
                <td
                  key={macro.clave}
                  className="py-1.5 pl-2 text-right text-xs font-medium"
                >
                  {metas[macro.clave] != null
                    ? `${metas[macro.clave]} ${macro.unidad}`
                    : "—"}
                </td>
              ))}
            </tr>
          )}

          {dias.map((dia) => (
            <tr key={dia.dia} className="border-b last:border-0">
              <th className="py-1.5 pr-2 text-left text-xs font-medium">
                {ETIQUETA_DIA[dia.dia]}
              </th>
              {MACROS.map((macro) => (
                <td key={macro.clave} className="py-1.5 pl-2 text-right">
                  <Celda
                    valor={dia.macros[macro.clave]}
                    unidad={macro.unidad}
                    comparacion={dia.comparacion[macro.clave]}
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
            {MACROS.map((macro) => (
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
        El promedio toma solo los días con macros cargados. Un día en verde está
        dentro del ±10 % de la meta.
      </p>
    </div>
  );
}

function Celda({
  valor,
  unidad,
  comparacion,
}: {
  valor: number | null;
  unidad: string;
  comparacion: DiaComparadoDto["comparacion"][ClaveMacro];
}) {
  if (valor == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const conMeta =
    comparacion.estado !== "SIN_META" && comparacion.estado !== "SIN_DATO";
  return (
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
  );
}

/** Promedio de cada macro sobre los días que tienen ese dato. */
export function promediosDe(
  dias: DiaComparadoDto[],
): Record<ClaveMacro, number | null> {
  const promedios = {} as Record<ClaveMacro, number | null>;
  for (const macro of MACROS) {
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

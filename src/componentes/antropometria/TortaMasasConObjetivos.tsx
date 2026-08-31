"use client";

import { useId, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Target } from "lucide-react";
import type {
  ObjetivoComposicionDto,
  MedicionComposicionDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import type { VariableComposicion } from "@/dominio/entidades/ObjetivoComposicion";
import { formatearMedida } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  MASAS,
  ETIQUETAS_MASA,
  type ClaveMasa,
  type TemaComposicion,
} from "./paleta";

/**
 * Qué masa mira cada variable de objetivo: las cinco del fraccionamiento, en
 * kg y en porcentaje. Las metas que no apuntan a una de las cinco (peso, IMC,
 * cintura, las del modelo de 2 componentes) no se dibujan acá: no tienen gajo,
 * y se leen en su propia tarjeta.
 */
const MASA_DE_VARIABLE: Partial<
  Record<VariableComposicion, { masa: ClaveMasa; enPorcentaje: boolean }>
> = {
  MASA_ADIPOSA_KG: { masa: "adiposa", enPorcentaje: false },
  MASA_ADIPOSA_PORCENTAJE: { masa: "adiposa", enPorcentaje: true },
  MASA_MUSCULAR_KG: { masa: "muscular", enPorcentaje: false },
  MASA_MUSCULAR_PORCENTAJE: { masa: "muscular", enPorcentaje: true },
  MASA_OSEA_KG: { masa: "osea", enPorcentaje: false },
  MASA_OSEA_PORCENTAJE: { masa: "osea", enPorcentaje: true },
  MASA_RESIDUAL_KG: { masa: "residual", enPorcentaje: false },
  MASA_RESIDUAL_PORCENTAJE: { masa: "residual", enPorcentaje: true },
  MASA_PIEL_KG: { masa: "piel", enPorcentaje: false },
  MASA_PIEL_PORCENTAJE: { masa: "piel", enPorcentaje: true },
};

interface GajoMasa {
  clave: ClaveMasa;
  etiqueta: string;
  color: string;
  actualKg: number;
  actualPorcentaje: number;
  /** Meta en kg, si esa masa tiene objetivo planteado. */
  objetivoKg: number | null;
  objetivoPorcentaje: number | null;
}

/**
 * Las cinco masas de hoy, con la meta marcada en las que tienen objetivo.
 *
 * Cada gajo ocupa el tamaño de la masa MAYOR entre el valor de hoy y la meta,
 * y la diferencia va rayada a 45°: si hay que bajar, el rayado es lo que
 * sobra; si hay que subir, lo que falta. Así una sola figura contesta las dos
 * preguntas —cómo está repartido el peso y cuánto hay que mover— sin obligar
 * a comparar dos tortas casi iguales.
 *
 * Las masas sin objetivo se pintan sólidas: no hay nada que marcar en ellas.
 */
export function TortaMasasConObjetivos({
  medicion,
  objetivos,
  tema,
}: {
  medicion: MedicionComposicionDto;
  objetivos: ObjetivoComposicionDto[];
  tema: TemaComposicion;
}) {
  const [activo, setActivo] = useState<ClaveMasa | null>(null);
  const idBase = useId().replace(/:/g, "");

  const fraccionamiento = medicion.resultado.fraccionamiento;
  if (!fraccionamiento) return null;

  const pesoEstructurado = fraccionamiento.pesoEstructuradoKg;

  const gajos: GajoMasa[] = MASAS.map((clave) => {
    const masa = fraccionamiento[clave];
    // La meta de esa masa, si alguien la planteó. Las de porcentaje se pasan
    // a kg contra el peso estructurado, que es el denominador con el que el
    // fraccionamiento calcula sus porcentajes.
    const meta = objetivos.find((objetivo) => {
      const destino = MASA_DE_VARIABLE[objetivo.variable];
      return destino?.masa === clave;
    });
    const destino = meta ? MASA_DE_VARIABLE[meta.variable] : undefined;

    const objetivoKg =
      meta && destino
        ? destino.enPorcentaje
          ? (meta.valorObjetivo * pesoEstructurado) / 100
          : meta.valorObjetivo
        : null;

    return {
      clave,
      etiqueta: ETIQUETAS_MASA[clave],
      color: tema.masas[clave],
      actualKg: masa.kg,
      actualPorcentaje: masa.porcentaje,
      objetivoKg: objetivoKg != null ? redondear(objetivoKg) : null,
      objetivoPorcentaje:
        objetivoKg != null
          ? redondear((objetivoKg / pesoEstructurado) * 100)
          : null,
    };
  });

  const conObjetivo = gajos.filter((gajo) => gajo.objetivoKg != null);
  if (conObjetivo.length === 0) return null;

  /**
   * Dos tramos por masa: la parte común a hoy y a la meta (sólida) y la
   * diferencia (rayada). El gajo entero mide lo mayor de las dos, así el
   * rayado se ve tanto cuando sobra como cuando falta.
   */
  const segmentos = gajos.flatMap((gajo) => {
    if (gajo.objetivoKg == null) {
      return [
        { clave: gajo.clave, gajo, valor: gajo.actualKg, esMargen: false },
      ];
    }
    const comun = Math.min(gajo.actualKg, gajo.objetivoKg);
    const margen = Math.abs(gajo.actualKg - gajo.objetivoKg);
    return [
      { clave: `${gajo.clave}-base`, gajo, valor: comun, esMargen: false },
      { clave: `${gajo.clave}-margen`, gajo, valor: margen, esMargen: true },
    ].filter((segmento) => segmento.valor > 0);
  });

  const señalado = gajos.find((gajo) => gajo.clave === activo) ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] sm:items-center">
      <div className="relative h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {conObjetivo.map((gajo) => (
                <pattern
                  key={gajo.clave}
                  id={`${idBase}-${gajo.clave}`}
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
                    stroke={gajo.color}
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
              innerRadius="56%"
              outerRadius="88%"
              startAngle={90}
              endAngle={-270}
              stroke={tema.superficie}
              strokeWidth={2}
              onMouseEnter={(_, indice: number) =>
                setActivo(segmentos[indice]?.gajo.clave ?? null)
              }
              onMouseLeave={() => setActivo(null)}
              isAnimationActive={false}
            >
              {segmentos.map((segmento) => (
                <Cell
                  key={segmento.clave}
                  fill={
                    segmento.esMargen
                      ? `url(#${idBase}-${segmento.gajo.clave})`
                      : segmento.gajo.color
                  }
                  opacity={
                    activo == null || activo === segmento.gajo.clave ? 1 : 0.3
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
                className="text-xs font-medium"
                style={{ color: tema.tinta }}
              >
                {señalado.etiqueta}
              </span>
              <span className="text-2xl font-bold tabular-nums">
                {formatearMedida(señalado.actualPorcentaje)}
                <span className="ml-0.5 text-sm font-normal">%</span>
              </span>
              {señalado.objetivoPorcentaje != null ? (
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: tema.tinta }}
                >
                  → {formatearMedida(señalado.objetivoPorcentaje)} %
                </span>
              ) : (
                <span
                  className="text-[11px]"
                  style={{ color: tema.tintaSuave }}
                >
                  sin objetivo
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-[11px]" style={{ color: tema.tintaSuave }}>
                Reparto actual
              </span>
              <span className="text-2xl font-bold tabular-nums">
                {formatearMedida(medicion.medidas.pesoKg)}
                <span className="ml-0.5 text-sm font-normal">kg</span>
              </span>
              <span className="text-[11px]" style={{ color: tema.tintaSuave }}>
                {conObjetivo.length} con objetivo
              </span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {/* Etiquetas directas: la identidad no la sostiene el color. */}
        <ul className="space-y-1">
          {gajos.map((gajo) => {
            const diferencia =
              gajo.objetivoKg != null ? gajo.objetivoKg - gajo.actualKg : null;
            return (
              <li
                key={gajo.clave}
                className={cn(
                  "flex items-baseline gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                  activo === gajo.clave && "bg-muted",
                )}
                onMouseEnter={() => setActivo(gajo.clave)}
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
                  {formatearMedida(gajo.actualPorcentaje)} %
                </span>
                {gajo.objetivoPorcentaje != null ? (
                  <>
                    <span
                      aria-hidden
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      →
                    </span>
                    <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
                      {formatearMedida(gajo.objetivoPorcentaje)} %
                    </span>
                    <span
                      className="w-14 shrink-0 text-right text-xs tabular-nums"
                      style={{
                        color:
                          (diferencia ?? 0) <= 0 ? tema.bien : tema.atencion,
                      }}
                    >
                      {(diferencia ?? 0) > 0 ? "+" : ""}
                      {formatearMedida(diferencia)} kg
                    </span>
                  </>
                ) : (
                  <span className="w-[6.5rem] shrink-0 text-right text-[11px] text-muted-foreground">
                    sin objetivo
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <p className="flex items-start gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
          <span
            aria-hidden
            className="mt-0.5 h-3 w-5 shrink-0 rounded-[2px]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${tema.tinta} 0 2px, transparent 2px 4px)`,
              border: `1px solid ${tema.eje}`,
            }}
          />
          <span>
            La parte rayada es la diferencia con el objetivo: lo que sobra si
            hay que bajar, lo que falta si hay que subir. Los porcentajes de la
            meta están calculados sobre el peso de hoy; si el peso también
            cambia, el reparto final va a diferir.
          </span>
        </p>
      </div>
    </div>
  );
}

/** Aviso cuando hay objetivos de masas pero la medición no las resuelve. */
export function SinFraccionamientoParaObjetivos({
  objetivos,
}: {
  objetivos: ObjetivoComposicionDto[];
}) {
  const deMasas = objetivos.filter(
    (objetivo) => MASA_DE_VARIABLE[objetivo.variable] != null,
  );
  if (deMasas.length === 0) return null;

  return (
    <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      <Target className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Hay {deMasas.length} objetivo(s) sobre las masas, pero la última
        medición no alcanza para el fraccionamiento en 5 masas: falta el perfil
        ISAK completo. Sin él no se puede dibujar el reparto ni medir el avance.
      </span>
    </p>
  );
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

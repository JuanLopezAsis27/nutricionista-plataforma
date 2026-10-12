"use client";

import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  EVOLUCIONES_ANTROPOMETRIA,
  type EvolucionAntropometria,
} from "@/dominio/entidades/evolucionesAntropometria";
import {
  CAMPOS_PLANTILLA,
  ETIQUETAS_CAMPO_PLANTILLA,
  type CampoPlantilla,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { formatearFecha, formatearMedida } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/componentes/ui/popover";
import { estiloTooltip, type TemaComposicion } from "./paleta";

interface SerieMedida {
  clave: string;
  etiqueta: string;
  valor: (medicion: MedicionComposicionDto) => number | null | undefined;
}

export interface VariableEvolucion {
  id: EvolucionAntropometria;
  etiqueta: string;
  /** Vacía para los índices sin unidad (cintura/cadera). */
  unidad: string;
  /**
   * Las series de un panel comparten unidad Y significado (derecha e
   * izquierda): lo que no comparte unidad va en otro panel, nunca en un
   * segundo eje.
   */
  series: SerieMedida[];
}

/** Una medida suelta, con su nombre de la planilla de carga. */
function unaSerie(
  id: EvolucionAntropometria,
  etiqueta: string,
  unidad: string,
  valor: SerieMedida["valor"],
): VariableEvolucion {
  return { id, etiqueta, unidad, series: [{ clave: id, etiqueta, valor }] };
}

function unidadDeCampo(campo: CampoPlantilla): string {
  return campo.startsWith("pliegue") ? "mm" : "cm";
}

/**
 * Cómo se dibuja cada id de `EVOLUCIONES_ANTROPOMETRIA`: su nombre, su unidad
 * y de dónde sale el valor. Los ids son del dominio (los guarda la
 * configuración); esto es solo su lectura.
 *
 * No recalcula nada: lee las medidas crudas y los derivados que ya trae el
 * DTO (`resultado`), recalculados por el dominio en cada lectura.
 */
const DERIVADAS: Record<
  Exclude<EvolucionAntropometria, CampoPlantilla>,
  VariableEvolucion
> = {
  pesoKg: unaSerie("pesoKg", "Peso", "kg", (m) => m.medidas.pesoKg),
  kgBajadosAcumulados: unaSerie(
    "kgBajadosAcumulados",
    "Kg bajados acumulados",
    "kg",
    // La primera consulta es el punto de partida: 0, no un hueco. Es la única
    // que no tiene anterior, y por eso tampoco tiene la diferencia parcial.
    (m) =>
      m.medidas.kgBajadosAcumulados ??
      (m.medidas.kgBajadosVsAnterior == null ? 0 : null),
  ),
  imc: unaSerie("imc", "IMC", "kg/m²", (m) => m.resultado.indices.imc),
  indiceCinturaCadera: unaSerie(
    "indiceCinturaCadera",
    "Índice cintura/cadera",
    "",
    (m) => m.resultado.indices.indiceCinturaCadera,
  ),
  sumatoria6Pliegues: unaSerie(
    "sumatoria6Pliegues",
    "Σ 6 pliegues",
    "mm",
    (m) => m.resultado.indices.sumatoria6Pliegues,
  ),
  sumatoria8Pliegues: unaSerie(
    "sumatoria8Pliegues",
    "Σ 8 pliegues",
    "mm",
    (m) => m.resultado.indices.sumatoria8Pliegues,
  ),
  masaMuscularKg: unaSerie(
    "masaMuscularKg",
    "Masa muscular",
    "kg",
    (m) => m.resultado.fraccionamiento?.muscular.kg,
  ),
  masaAdiposaKg: unaSerie(
    "masaAdiposaKg",
    "Masa adiposa",
    "kg",
    (m) => m.resultado.fraccionamiento?.adiposa.kg,
  ),
  fuerzaPrension: {
    id: "fuerzaPrension",
    etiqueta: "Fuerza de prensión",
    unidad: "kg",
    series: [
      {
        clave: "prensionDerecha",
        etiqueta: "Derecha",
        valor: (m) => m.medidas.fuerzaPrensionDerecha,
      },
      {
        clave: "prensionIzquierda",
        etiqueta: "Izquierda",
        valor: (m) => m.medidas.fuerzaPrensionIzquierda,
      },
    ],
  },
};

const DE_LA_PLANILLA = Object.fromEntries(
  CAMPOS_PLANTILLA.map((campo) => [
    campo,
    unaSerie(
      campo,
      ETIQUETAS_CAMPO_PLANTILLA[campo],
      unidadDeCampo(campo),
      (m) => m.medidas[campo],
    ),
  ]),
) as Record<CampoPlantilla, VariableEvolucion>;

export const DEFINICIONES_EVOLUCION: Record<
  EvolucionAntropometria,
  VariableEvolucion
> = { ...DERIVADAS, ...DE_LA_PLANILLA };

/**
 * Los grupos del selector, como en la planilla de carga: se busca «pliegue
 * tricipital» donde están los pliegues.
 */
export const GRUPOS_EVOLUCION: {
  titulo: string;
  ids: EvolucionAntropometria[];
}[] = [
  {
    titulo: "Generales",
    ids: [
      "pesoKg",
      "kgBajadosAcumulados",
      "tallaCm",
      "tallaSentadoCm",
      "imc",
      "indiceCinturaCadera",
      "fuerzaPrension",
    ],
  },
  {
    titulo: "Composición",
    ids: [
      "sumatoria6Pliegues",
      "sumatoria8Pliegues",
      "masaMuscularKg",
      "masaAdiposaKg",
    ],
  },
  {
    titulo: "Perímetros",
    ids: CAMPOS_PLANTILLA.filter((c) => c.startsWith("circ")),
  },
  {
    titulo: "Pliegues cutáneos",
    ids: CAMPOS_PLANTILLA.filter((c) => c.startsWith("pliegue")),
  },
  {
    titulo: "Diámetros óseos",
    ids: CAMPOS_PLANTILLA.filter((c) => c.startsWith("diam")),
  },
];

interface PuntoMedida {
  tiempo: number;
  [clave: string]: number | null;
}

/**
 * Los puntos de una variable: solo las consultas que midieron ALGUNA de sus
 * series. Una consulta sin pliegue tricipital no es un cero de pliegue, y
 * meterla estiraría el eje de tiempo hasta una fecha sin nada dibujado.
 */
export function puntosDeVariable(
  mediciones: MedicionComposicionDto[],
  variable: VariableEvolucion,
): PuntoMedida[] {
  return mediciones
    .map((medicion) => {
      const punto: PuntoMedida = { tiempo: new Date(medicion.fecha).getTime() };
      for (const serie of variable.series) {
        punto[serie.clave] = serie.valor(medicion) ?? null;
      }
      return punto;
    })
    .filter((punto) =>
      variable.series.some((serie) => punto[serie.clave] != null),
    );
}

/** Los ids con al menos dos consultas: con una sola no hay evolución. */
export function evolucionesConDatos(
  mediciones: MedicionComposicionDto[],
): Set<EvolucionAntropometria> {
  return new Set(
    EVOLUCIONES_ANTROPOMETRIA.filter(
      (id) =>
        puntosDeVariable(mediciones, DEFINICIONES_EVOLUCION[id]).length >= 2,
    ),
  );
}

const CLAVE_ALMACEN = "evolucion-medidas:profesional";

/** Lo elegido en este navegador, sin los ids que ya no existen. */
function leerEleccion(): EvolucionAntropometria[] | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN);
    if (crudo == null) return null;
    const valor: unknown = JSON.parse(crudo);
    if (!Array.isArray(valor)) return null;
    return EVOLUCIONES_ANTROPOMETRIA.filter((id) => valor.includes(id));
  } catch {
    return null;
  }
}

function guardarEleccion(ids: EvolucionAntropometria[]): void {
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(ids));
  } catch {
    // Sin almacenamiento (ventana privada): la elección dura lo que la pantalla.
  }
}

/**
 * Evolución de las medidas de la antropometría: peso, cada perímetro, cada
 * pliegue, la prensión y los derivados de `EVOLUCIONES_ANTROPOMETRIA`.
 *
 * Un panel por medida y no un solo gráfico con todas: kg, cm, mm y un índice
 * sin unidad no comparten eje, y un segundo eje Y hace que dos curvas se
 * crucen donde el que dibujó eligió la escala. Paneles chicos, cada uno con su
 * eje recortado, y el mismo eje de TIEMPO que la serie de grasa.
 *
 * Dos usos:
 *
 * - **Paciente** (`seleccionable` apagado): ve exactamente las `evoluciones`
 *   que eligió el consultorio en Configuración → Antropometría.
 * - **Profesional** (`seleccionable`): arranca en esas mismas —lo que ve su
 *   paciente— y puede elegir otras para mirar él. Esa elección es una
 *   preferencia de lectura y se recuerda en su navegador; no cambia lo que ve
 *   el paciente.
 */
export function EvolucionMedidas({
  mediciones,
  tema,
  evoluciones,
  seleccionable = false,
}: {
  mediciones: MedicionComposicionDto[];
  tema: TemaComposicion;
  /** Las que eligió el consultorio para el portal. */
  evoluciones: EvolucionAntropometria[];
  seleccionable?: boolean;
}) {
  const [propias, setPropias] = useState<EvolucionAntropometria[] | null>(() =>
    seleccionable ? leerEleccion() : null,
  );
  const elegidas = propias ?? evoluciones;
  const conDatos = evolucionesConDatos(mediciones);

  const alternar = (id: EvolucionAntropometria): void => {
    const siguientes = elegidas.includes(id)
      ? elegidas.filter((elegida) => elegida !== id)
      : [...elegidas, id];
    setPropias(siguientes);
    guardarEleccion(siguientes);
  };

  // En el orden del catálogo, no en el orden en que se tildaron: los paneles
  // no se reacomodan cada vez que se suma uno.
  const visibles = EVOLUCIONES_ANTROPOMETRIA.filter(
    (id) => elegidas.includes(id) && conDatos.has(id),
  );

  return (
    <div className="space-y-4">
      {seleccionable && conDatos.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4" />
                Elegir medidas ({visibles.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="max-h-[70vh] w-[min(92vw,40rem)] space-y-3 overflow-y-auto"
            >
              <SelectorEvoluciones
                elegidas={new Set(elegidas)}
                alAlternar={alternar}
                ofrecidas={conDatos}
              />
              <p className="text-xs text-muted-foreground">
                Solo aparecen las medidas con dos consultas o más. Lo que ve el
                paciente se elige en Configuración → Antropometría.
              </p>
            </PopoverContent>
          </Popover>
          {propias != null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPropias(null);
                try {
                  window.localStorage.removeItem(CLAVE_ALMACEN);
                } catch {
                  // Sin almacenamiento: no había nada que borrar.
                }
              }}
            >
              Ver lo mismo que el paciente
            </Button>
          )}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {seleccionable && conDatos.size > 0
            ? "Elegí una o más medidas para ver su evolución."
            : "Con dos mediciones vas a ver cómo evoluciona cada medida."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibles.map((id) => (
            <PanelMedida
              key={id}
              variable={DEFINICIONES_EVOLUCION[id]}
              puntos={puntosDeVariable(mediciones, DEFINICIONES_EVOLUCION[id])}
              tema={tema}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Grilla de evoluciones agrupada, compartida por el selector del dashboard y
 * la configuración del portal: con una copia por pantalla, una medida nueva
 * terminaba ofrecida en una sola.
 */
export function SelectorEvoluciones({
  elegidas,
  alAlternar,
  ofrecidas,
}: {
  elegidas: ReadonlySet<EvolucionAntropometria>;
  alAlternar: (id: EvolucionAntropometria) => void;
  /** Si viene, solo se ofrecen estas (las que tienen datos). */
  ofrecidas?: ReadonlySet<EvolucionAntropometria>;
}) {
  return (
    <div className="space-y-3">
      {GRUPOS_EVOLUCION.map((grupo) => {
        const ids = grupo.ids.filter((id) => ofrecidas?.has(id) ?? true);
        if (ids.length === 0) return null;
        return (
          <fieldset key={grupo.titulo} className="space-y-2">
            <legend className="text-sm font-semibold">{grupo.titulo}</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {ids.map((id) => {
                const activo = elegidas.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    role="switch"
                    aria-checked={activo}
                    onClick={() => alAlternar(id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                      activo
                        ? "border-primary bg-primary/5 font-medium"
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
                        activo
                          ? "border-primary bg-primary text-white"
                          : "border-input",
                      )}
                    >
                      {activo && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 truncate">
                      {DEFINICIONES_EVOLUCION[id].etiqueta}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/**
 * Un panel: el nombre de la variable y el último valor de cada serie escrito
 * en texto —el color no es nunca el único canal—, y la línea debajo.
 */
function PanelMedida({
  variable,
  puntos,
  tema,
}: {
  variable: VariableEvolucion;
  puntos: PuntoMedida[];
  tema: TemaComposicion;
}) {
  const conDato = variable.series.filter((serie) =>
    puntos.some((punto) => punto[serie.clave] != null),
  );
  const medidos = conDato.flatMap((serie) =>
    puntos
      .map((punto) => punto[serie.clave])
      .filter((valor): valor is number => valor != null),
  );
  // Eje recortado con un margen del 10 % del recorrido (mínimo una décima):
  // la cintura se mueve 3 cm sobre 90, y desde cero eso es una recta.
  const recorrido = Math.max(...medidos) - Math.min(...medidos);
  const margen = Math.max(recorrido * 0.1, 0.1);
  const minimo = Math.min(...medidos) - margen;
  const maximo = Math.max(...medidos) + margen;
  const unidad = variable.unidad ? ` ${variable.unidad}` : "";

  // El color va por la posición de la serie en SU variable, no entre las que
  // tienen dato: si falta la derecha, la izquierda sigue siendo naranja.
  const colorDe = (serie: SerieMedida): string =>
    tema.pliegues[variable.series.indexOf(serie) % tema.pliegues.length]!;

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium">
          {variable.etiqueta}
          {variable.unidad && (
            <span className="ml-1 font-normal text-muted-foreground">
              ({variable.unidad})
            </span>
          )}
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {conDato.map((serie) => {
            const ultimo = [...puntos]
              .reverse()
              .find((punto) => punto[serie.clave] != null);
            return (
              <li key={serie.clave} className="flex items-center gap-1.5">
                {variable.series.length > 1 && (
                  <>
                    <span
                      aria-hidden
                      className="h-0.5 w-4 rounded-full"
                      style={{ backgroundColor: colorDe(serie) }}
                    />
                    <span className="text-muted-foreground">
                      {serie.etiqueta}
                    </span>
                  </>
                )}
                <span className="font-medium tabular-nums">
                  {formatearMedida(ultimo?.[serie.clave])}
                  {unidad}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={puntos}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke={tema.grilla}
            strokeWidth={1}
            vertical={false}
          />
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
            tickFormatter={(valor: number) => formatearMedida(valor)}
            tick={{ fill: tema.tinta, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: tema.eje, strokeWidth: 1 }}
            contentStyle={estiloTooltip(tema)}
            labelFormatter={(valor) =>
              formatearFecha(new Date(valor as number))
            }
            formatter={(valor, nombre) => [
              `${formatearMedida(valor as number)}${unidad}`,
              String(nombre),
            ]}
          />
          {conDato.map((serie) => {
            const color = colorDe(serie);
            return (
              <Line
                key={serie.clave}
                type="linear"
                dataKey={serie.clave}
                name={serie.etiqueta}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
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
    </div>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dumbbell, Droplets, Scale } from "lucide-react";
import type { MedicionBioimpedanciaDto } from "@/aplicacion/dtos/bioimpedancia.dto";
import type { MedidasBioimpedancia } from "@/dominio/entidades/Bioimpedancia";
import { formatearFecha, formatearMedida } from "@/lib/formato";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Indicador, signo } from "@/componentes/antropometria/dashboard/piezas";
import {
  estiloTooltip,
  type TemaComposicion,
} from "@/componentes/antropometria/paleta";
import { useTemaComposicion } from "@/componentes/antropometria/useTemaComposicion";
import { LineaDeTiempo } from "@/componentes/comunes/LineaDeTiempo";

type Campo = keyof MedidasBioimpedancia;

/** Radio de la punta de barra, según el sistema de marcas. */
const PUNTA: [number, number, number, number] = [4, 4, 0, 0];

interface Serie {
  campo: Campo;
  etiqueta: string;
  color: (tema: TemaComposicion) => string;
}

/**
 * Músculo y grasa usan los MISMOS colores que la masa muscular y la adiposa
 * del dashboard de antropometría (las dos primeras ranuras categóricas,
 * validadas como par): el mismo tejido se lee con el mismo color en las dos
 * pestañas, aunque los números salgan de métodos distintos.
 */
const SERIES_KG: Serie[] = [
  {
    campo: "masaMuscularKg",
    etiqueta: "Músculo",
    color: (t) => t.masas.muscular,
  },
  { campo: "masaGrasaKg", etiqueta: "Grasa", color: (t) => t.masas.adiposa },
];
const SERIES_PORCENTAJE: Serie[] = [
  {
    campo: "porcentajeMuscular",
    etiqueta: "Músculo",
    color: (t) => t.masas.muscular,
  },
  {
    campo: "porcentajeGrasa",
    etiqueta: "Grasa",
    color: (t) => t.masas.adiposa,
  },
];

/**
 * Dashboard de bioimpedancia: la última consulta contra la anterior y la
 * serie de cada valor.
 *
 * Kilos y porcentajes van en gráficos SEPARADOS: son dos escalas, y un eje
 * doble haría que la altura relativa de las barras dependiera de cómo se
 * eligieron los dos rangos. El peso va aparte de los tejidos por lo mismo que
 * no se apila: músculo y grasa no suman el peso (falta el resto del cuerpo), y
 * una barra al lado de las otras se leería como si fuera un tejido más.
 *
 * El peso es una LÍNEA DE TIEMPO y no barras: es la serie que se sigue de
 * punta a punta, y lo que se lee es su recorrido. Con barras desde cero, bajar
 * tres kilos sobre ochenta no se ve; y el eje temporal real muestra cuánto
 * tiempo separa a cada consulta.
 */
export function DashboardBioimpedancia({
  mediciones,
}: {
  mediciones: MedicionBioimpedanciaDto[];
}) {
  const { tema, montado } = useTemaComposicion();
  if (!montado) return null;

  if (mediciones.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Todavía no hay mediciones de bioimpedancia. Cargá una con «Nueva
        medición» y acá vas a ver cómo evolucionan el peso, el músculo y la
        grasa.
      </p>
    );
  }

  const actual = mediciones[mediciones.length - 1]!;
  const anterior =
    mediciones.length > 1 ? mediciones[mediciones.length - 2]! : null;

  const detalle = (campo: Campo, unidad: string): string | undefined => {
    const hoy = actual[campo];
    const antes = anterior?.[campo];
    if (hoy == null || antes == null) return undefined;
    const delta = Math.round((hoy - antes) * 100) / 100;
    return delta === 0
      ? "Sin cambios vs. la anterior"
      : `${signo(delta)} ${unidad} vs. la anterior`;
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Última medición: {formatearFecha(actual.fecha)}
        {anterior &&
          ` · comparada con la del ${formatearFecha(anterior.fecha)}`}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          icono={Scale}
          titulo="Peso"
          valor={formatearMedida(actual.pesoKg)}
          unidad="kg"
          detalle={detalle("pesoKg", "kg")}
        />
        <Indicador
          icono={Dumbbell}
          titulo="Músculo"
          valor={formatearMedida(actual.masaMuscularKg)}
          unidad={
            actual.porcentajeMuscular != null
              ? `kg · ${formatearMedida(actual.porcentajeMuscular)} %`
              : "kg"
          }
          detalle={detalle("masaMuscularKg", "kg")}
          color={tema.masas.muscular}
        />
        <Indicador
          icono={Droplets}
          titulo="Grasa"
          valor={formatearMedida(actual.masaGrasaKg)}
          unidad={
            actual.porcentajeGrasa != null
              ? `kg · ${formatearMedida(actual.porcentajeGrasa)} %`
              : "kg"
          }
          detalle={detalle("masaGrasaKg", "kg")}
          color={tema.masas.adiposa}
        />
      </div>

      {mediciones.length < 2 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Con una segunda medición vas a ver la evolución de cada valor.
        </p>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <TarjetaSerie
              titulo="Músculo y grasa (kg)"
              mediciones={mediciones}
              series={SERIES_KG}
              unidad="kg"
              tema={tema}
            />
            <TarjetaSerie
              titulo="Músculo y grasa (%)"
              mediciones={mediciones}
              series={SERIES_PORCENTAJE}
              unidad="%"
              tema={tema}
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Evolución del peso
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-0 pr-3">
              <LineaDeTiempo
                puntos={mediciones.map((m) => ({
                  fecha: m.fecha,
                  valor: m.pesoKg,
                }))}
                unidad="kg"
                nombre="Peso"
                colores={{
                  // Una sola serie: el color no identifica nada, así que va
                  // en la tinta neutra y el título la nombra.
                  linea: tema.tinta,
                  grilla: tema.grilla,
                  tinta: tema.tinta,
                  eje: tema.eje,
                  superficie: tema.superficie,
                  borde: tema.borde,
                  texto: tema.texto,
                }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * Barras y no líneas, como en la antropometría: son consultas discretas y
 * espaciadas, y una línea entre dos de ellas insinúa valores intermedios que
 * nadie midió.
 */
function TarjetaSerie({
  titulo,
  mediciones,
  series,
  unidad,
  tema,
}: {
  titulo: string;
  mediciones: MedicionBioimpedanciaDto[];
  series: Serie[];
  unidad: string;
  tema: TemaComposicion;
}) {
  // Solo las consultas que trajeron al menos uno de los valores del gráfico.
  const puntos = mediciones
    .filter((m) => series.some((s) => m[s.campo] != null))
    .map((m) => ({
      fecha: formatearFecha(m.fecha),
      ...Object.fromEntries(series.map((s) => [s.campo, m[s.campo]])),
    }));
  const ultima = mediciones[mediciones.length - 1]!;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {puntos.length < 2 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Hace falta este dato en al menos dos consultas.
          </p>
        ) : (
          <>
            {/* Leyenda con el último valor escrito: el color nunca es el único
                canal por el que se lee un número. */}
            {series.length > 1 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {series.map((s) => (
                  <li key={s.campo} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-[2px]"
                      style={{ backgroundColor: s.color(tema) }}
                    />
                    {s.etiqueta}
                    <span className="tabular-nums text-muted-foreground">
                      {formatearMedida(ultima[s.campo])} {unidad}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ResponsiveContainer width="100%" height={240}>
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
                  unit={` ${unidad}`}
                />
                <Tooltip
                  cursor={{ fill: tema.grilla, fillOpacity: 0.35 }}
                  contentStyle={estiloTooltip(tema)}
                  formatter={(valor, nombre) => [
                    `${formatearMedida(valor as number)} ${unidad}`,
                    series.find((s) => s.campo === nombre)?.etiqueta ??
                      String(nombre),
                  ]}
                />
                {series.map((s) => (
                  <Bar
                    key={s.campo}
                    dataKey={s.campo}
                    fill={s.color(tema)}
                    radius={PUNTA}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

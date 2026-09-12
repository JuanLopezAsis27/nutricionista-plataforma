"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipPayloadEntry,
} from "recharts";
import {
  TrendingUp,
  Target,
  UtensilsCrossed,
  Scale,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";
import { useTracking } from "@/lib/hooks/useTracking";
import { formatearFecha, formatearNumero, hoyLocalISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { TEMAS_GRAFICO } from "@/componentes/estadisticas/paletaGraficos";
import { MetricasDispositivo } from "./MetricasDispositivo";
import { TarjetasHabitos } from "@/componentes/seguimiento/TarjetasHabitos";

/**
 * Paletas por tema, validadas con el validador de dataviz contra las
 * superficies reales de las cards (#FFFFFF claro / #1D1D20 oscuro):
 * coral para el peso, verde/rojo para cumplimiento.
 *
 * El peso de consulta usa el AZUL de `paletaGraficos` —el otro miembro de la
 * categórica de dos series ya validada contra el coral— y se lee de ahí en vez
 * de copiar el hex: dos copias del mismo color se desalinean en cuanto alguien
 * ajusta un solo gráfico, que es la razón por la que esa paleta vive aparte.
 */
const TEMAS = {
  light: {
    peso: "#F4535E",
    bien: "#17996B",
    mal: "#C0392B",
    tinta: "#52514E",
    grilla: "#E1E0D9",
    fondoTooltip: "#FFFFFF",
    bordeTooltip: "rgba(11,11,11,0.10)",
    texto: "#0B0B0B",
  },
  dark: {
    peso: "#EF4E59",
    bien: "#199E70",
    mal: "#E5544B",
    tinta: "#C3C2B7",
    grilla: "#2C2C2A",
    fondoTooltip: "#1D1D20",
    bordeTooltip: "rgba(255,255,255,0.10)",
    texto: "#FFFFFF",
  },
} as const;

const PERIODOS = [
  { dias: 30, etiqueta: "30 días" },
  { dias: 60, etiqueta: "60 días" },
  { dias: 90, etiqueta: "90 días" },
  { dias: 180, etiqueta: "180 días" },
  { dias: 365, etiqueta: "1 año" },
] as const;

/** De dónde salió el peso que se está mirando. */
type FuentePeso = "CONSULTA" | "DIARIO";

/**
 * Las dos fuentes de peso, en el orden del selector. La de CONSULTA va primera
 * y es la predeterminada: la balanza del consultorio es la misma en cada
 * medición y la toma el profesional, así que es la serie sobre la que se
 * decide. La de casa varía con la balanza, la hora y la ropa, y sirve para ver
 * la tendencia entre consultas, no para comparar contra la anterior.
 */
const FUENTES_PESO = [
  {
    valor: "CONSULTA",
    etiqueta: "En consulta",
    detalle: "lo que se midió en el consultorio",
  },
  {
    valor: "DIARIO",
    etiqueta: "En el diario",
    detalle: "lo que se registra en casa",
  },
] as const;

/** Proyección lineal de peso a 30 días, estimada sobre la tendencia reciente. */
interface ProyeccionPeso {
  fecha: Date;
  peso: number;
}

/** La serie de peso con sus cifras, ya recortada a una fuente. */
interface SeriePeso {
  puntos: { fecha: Date; peso: number; fuente: FuentePeso }[];
  inicial: number | null;
  actual: number | null;
  variacion: number | null;
  proyeccion: ProyeccionPeso | null;
}

const VENTANA_PROYECCION = 12; // últimos puntos que entran en la regresión
const DIAS_MINIMOS_PROYECCION = 14; // span mínimo para no proyectar con poca info
const PUNTOS_MINIMOS_PROYECCION = 3;
const HORIZONTE_PROYECCION_DIAS = 30;

/**
 * Proyecta el peso a 30 días por regresión lineal simple (mínimos cuadrados)
 * sobre los últimos puntos de la serie — mismo método y mismos umbrales que
 * `ml-servicio/modelos.py::tendencia_peso`, reimplementados acá porque esta
 * pantalla no pasa por el ml-servicio (ver `ObtenerTrackingDePaciente.ts`).
 *
 * Devuelve `null` si no hay suficiente historial reciente: con pocos puntos o
 * un rango corto, la pendiente es ruido, no tendencia.
 */
function proyectarPeso(
  puntos: { fecha: Date; peso: number }[],
): ProyeccionPeso | null {
  const ventana = puntos.slice(-VENTANA_PROYECCION);
  if (ventana.length < PUNTOS_MINIMOS_PROYECCION) return null;

  const dia0 = ventana[0]!.fecha.getTime();
  const MS_POR_DIA = 86_400_000;
  const x = ventana.map((p) => (p.fecha.getTime() - dia0) / MS_POR_DIA);
  const y = ventana.map((p) => p.peso);
  const ultimoX = x[x.length - 1]!;
  if (ultimoX < DIAS_MINIMOS_PROYECCION) return null;

  const n = x.length;
  const sumaX = x.reduce((a, b) => a + b, 0);
  const sumaY = y.reduce((a, b) => a + b, 0);
  const sumaXY = x.reduce((a, xi, i) => a + xi * y[i]!, 0);
  const sumaXX = x.reduce((a, xi) => a + xi * xi, 0);
  const denominador = n * sumaXX - sumaX * sumaX;
  if (denominador === 0) return null; // todos los puntos en el mismo día

  const pendiente = (n * sumaXY - sumaX * sumaY) / denominador;
  const interseccion = (sumaY - pendiente * sumaX) / n;
  const xProyectado = ultimoX + HORIZONTE_PROYECCION_DIAS;

  return {
    fecha: new Date(dia0 + xProyectado * MS_POR_DIA),
    peso: Math.round((pendiente * xProyectado + interseccion) * 10) / 10,
  };
}

/**
 * Recorta la serie a una sola fuente y RECALCULA sus cifras.
 *
 * Inicial, actual y variación tienen que salir de los mismos puntos que se
 * dibujan: una variación que arranca en la balanza de casa y termina en la del
 * consultorio no mide el cambio del paciente, mide el cambio de balanza. Los
 * puntos vienen del servidor ordenados por fecha, así que filtrar los mantiene
 * ordenados. La proyección corre sobre esta misma serie recortada, por lo
 * mismo: mezclar balanzas mide el cambio de balanza, no la tendencia.
 */
function filtrarPeso(
  peso: Pick<SeriePeso, "puntos">,
  fuente: FuentePeso,
): SeriePeso {
  const puntos = peso.puntos.filter((p) => p.fuente === fuente);
  const inicial = puntos[0]?.peso ?? null;
  const actual = puntos[puntos.length - 1]?.peso ?? null;
  return {
    puntos,
    inicial,
    actual,
    variacion:
      inicial != null && actual != null
        ? Math.round((actual - inicial) * 10) / 10
        : null,
    proyeccion: proyectarPeso(puntos),
  };
}

/**
 * Sección de Progreso del paciente: el seguimiento del DÍA A DÍA — peso que se
 * registra en casa, hábitos, adherencia a los axiomas y concordancia con el
 * plan. Absorbió la vieja pestaña «Informes», que mostraba los mismos hábitos
 * y la misma curva de peso con otro formato.
 *
 * Lo que NO va acá son las medidas de consulta: pliegues, perímetros,
 * fraccionamiento en masas y somatotipo viven en la pestaña «Antropometría»,
 * que es la única que los carga y los lee.
 *
 * Se usa en el portal del paciente (sin `pacienteId`) y en la ficha del
 * nutricionista (con `pacienteId`); el resumen de hábitos solo aparece del
 * lado del profesional, porque su endpoint es suyo.
 */
export function SeccionTracking({ pacienteId }: { pacienteId?: string }) {
  const [dias, setDias] = useState<number>(30);
  const [fuentePeso, setFuentePeso] = useState<FuentePeso>("CONSULTA");
  const { miTracking, dePaciente } = useTracking();

  const hasta = useMemo(() => new Date(hoyLocalISO()), []);
  const desde = useMemo(() => {
    const d = new Date(hasta);
    d.setDate(d.getDate() - dias);
    return d;
  }, [hasta, dias]);

  const esNutri = pacienteId != null;
  const consultaNutri = dePaciente(
    { pacienteId: pacienteId ?? "", desde, hasta },
    { enabled: esNutri },
  );
  const consultaMia = miTracking({ desde, hasta }, { enabled: !esNutri });
  const consulta = esNutri ? consultaNutri : consultaMia;
  const datos = consulta.data;

  // La cifra de arriba y la curva miran la MISMA fuente: dos números de peso
  // distintos en la misma pantalla se leen como un error de la app.
  const peso = useMemo(
    () => (datos ? filtrarPeso(datos.peso, fuentePeso) : null),
    [datos, fuentePeso],
  );

  // Promedio de cumplimiento de los axiomas que SÍ se miden: los informativos
  // no tienen porcentaje, y contarlos como cero hundiría el número por tener
  // recomendaciones cargadas.
  const evaluables = (datos?.adherencia ?? []).filter(
    (a) => a.porcentaje != null,
  );
  const cumplimiento =
    evaluables.length > 0
      ? Math.round(
          evaluables.reduce((suma, a) => suma + (a.porcentaje ?? 0), 0) /
            evaluables.length,
        )
      : null;

  return (
    <div className="space-y-4">
      {/* Selector de período: un solo control segmentado, no tres botones
          sueltos. Son opciones excluyentes de lo mismo. */}
      <div
        className="inline-flex flex-wrap gap-y-1 rounded-xl border bg-card p-1"
        role="group"
        aria-label="Período"
      >
        {PERIODOS.map((p) => (
          <button
            key={p.dias}
            type="button"
            aria-pressed={p.dias === dias}
            onClick={() => setDias(p.dias)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              p.dias === dias
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {consulta.isLoading || !datos || !peso ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : datos.diasConRegistro === 0 && datos.peso.puntos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="pt-2 text-sm text-muted-foreground">
            Todavía no hay registros en este período. Cargá tu peso, agua, sueño
            y comidas para ver tu progreso acá.
          </p>
        </div>
      ) : (
        <>
          {/* Las tres cifras del período, antes de cualquier gráfico: es lo que
              se mira primero y lo que el resto de la pantalla desarrolla. */}
          <div className="grid grid-cols-3 gap-2.5">
            <Cifra
              etiqueta="Variación de peso"
              valor={
                peso.variacion != null
                  ? `${peso.variacion > 0 ? "+" : ""}${formatearNumero(peso.variacion)}`
                  : "—"
              }
              unidad={peso.variacion != null ? "kg" : undefined}
              tinte="bg-rose-500/10"
              color="text-rose-600 dark:text-rose-400"
              icono={Scale}
            />
            <Cifra
              etiqueta="Días con registro"
              valor={String(datos.diasConRegistro)}
              unidad={`de ${dias}`}
              tinte="bg-sky-500/10"
              color="text-sky-600 dark:text-sky-400"
              icono={CalendarCheck}
            />
            <Cifra
              etiqueta="Cumplimiento"
              valor={cumplimiento != null ? String(cumplimiento) : "—"}
              unidad={cumplimiento != null ? "%" : undefined}
              tinte="bg-emerald-500/10"
              color="text-emerald-600 dark:text-emerald-400"
              icono={Target}
            />
          </div>

          {esNutri && (
            <TarjetasHabitos
              pacienteId={pacienteId}
              desde={desde}
              hasta={hasta}
            />
          )}
          <TarjetaPeso
            peso={peso}
            fuente={fuentePeso}
            onCambiarFuente={setFuentePeso}
          />
          <TarjetaAdherencia adherencia={datos.adherencia} />
          <TarjetaConcordancia concordancia={datos.concordancia} />
          {esNutri && (
            <p className="text-xs text-muted-foreground">
              La curva de peso muestra una fuente por vez: el peso de las
              mediciones de consulta o el que el paciente carga en su diario. El
              resto de las medidas de consulta —pliegues, perímetros, masas y
              somatotipo— está en la pestaña «Antropometría».
            </p>
          )}
        </>
      )}

      {/* Datos del wearable (independiente del diario): opt-in por día. */}
      <MetricasDispositivo
        pacienteId={pacienteId}
        editable={!esNutri}
        desde={desde}
        hasta={hasta}
      />
    </div>
  );
}

/** Una de las tres cifras del período, arriba de todo. */
function Cifra({
  etiqueta,
  valor,
  unidad,
  tinte,
  color,
  icono: Icono,
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  tinte: string;
  color: string;
  icono: LucideIcon;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          tinte,
        )}
      >
        <Icono className={cn("h-4 w-4", color)} />
      </span>
      <p className="pt-2 text-xl font-bold tabular-nums leading-none">
        {valor}
        {unidad && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unidad}
          </span>
        )}
      </p>
      <p className="pt-1 text-xs leading-tight text-muted-foreground">
        {etiqueta}
      </p>
    </div>
  );
}

// --- Peso --------------------------------------------------------------------

/**
 * La curva de peso, de UNA fuente por vez.
 *
 * El peso llega de dos lados —lo que el paciente carga en su diario y lo que se
 * mide en la consulta— y antes iban las dos juntas, cada una con su trazo. La
 * balanza de casa a la mañana y la del consultorio a la tarde no miden lo
 * mismo, así que un escalón entre un punto de una serie y el de la otra no es
 * progreso: es el cambio de balanza. Superpuestas se seguían leyendo como una
 * sola curva, así que ahora el selector deja ver una a la vez.
 *
 * Predeterminada, la de CONSULTA: es la que toma el profesional, siempre con la
 * misma balanza y el mismo procedimiento, y es sobre la que se decide. La del
 * diario está a un clic y sirve para la tendencia entre consultas.
 *
 * La serie llega ya filtrada y con sus cifras recalculadas (`filtrarPeso`); acá
 * solo se dibuja. El color y el trazo se conservan por fuente —coral continuo
 * el diario, azul punteado la consulta— para que cambiar de fuente se note aun
 * sin mirar el selector.
 */
function TarjetaPeso({
  peso,
  fuente,
  onCambiarFuente,
}: {
  peso: SeriePeso;
  fuente: FuentePeso;
  onCambiarFuente: (fuente: FuentePeso) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const oscuro = resolvedTheme === "dark";
  const tema = oscuro ? TEMAS.dark : TEMAS.light;
  const esConsulta = fuente === "CONSULTA";
  const color = esConsulta
    ? oscuro
      ? TEMAS_GRAFICO.dark.total
      : TEMAS_GRAFICO.light.total
    : tema.peso;
  const descriptor = FUENTES_PESO.find((f) => f.valor === fuente)!;

  // Una fila por punto, sin agrupar por fecha: dentro de una misma fuente hay
  // como mucho un peso por día (`@@unique([pacienteId, fecha])` en las dos
  // tablas), así que ninguna fecha se repite en el eje.
  //
  // La proyección se dibuja como una segunda línea que arranca en el último
  // punto real (repitiendo su valor en `proyeccionValor` para que el trazo
  // conecte sin salto) y termina en el punto estimado a 30 días. Los puntos
  // anteriores no llevan `proyeccionValor`, así que esa línea no aparece ahí.
  const serie = useMemo(() => {
    const puntos = peso.puntos.map((punto, i) => ({
      fecha: formatearFecha(punto.fecha),
      peso: punto.peso,
      proyeccionValor:
        peso.proyeccion && i === peso.puntos.length - 1
          ? punto.peso
          : undefined,
    }));
    if (peso.proyeccion) {
      puntos.push({
        fecha: formatearFecha(peso.proyeccion.fecha),
        peso: undefined as unknown as number,
        proyeccionValor: peso.proyeccion.peso,
      });
    }
    return puntos;
  }, [peso.puntos, peso.proyeccion]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3 border-b bg-rose-500/5 p-4">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
              <TrendingUp className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </span>
            Peso registrado
          </span>
          <span className="flex items-baseline gap-3">
            {peso.variacion != null && (
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  peso.variacion <= 0
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                {peso.variacion > 0 ? "+" : ""}
                {formatearNumero(peso.variacion)} kg
              </span>
            )}
            {peso.proyeccion != null && (
              <span className="text-xs font-medium text-muted-foreground">
                Proyección 30 días: {formatearNumero(peso.proyeccion.peso)} kg
              </span>
            )}
          </span>
        </CardTitle>
        {/* Mismo control segmentado que el período: son dos lecturas
            excluyentes de lo mismo, no dos filtros que se acumulan. */}
        <div
          className="inline-flex rounded-lg border bg-card p-1"
          role="group"
          aria-label="Fuente del peso"
        >
          {FUENTES_PESO.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={f.valor === fuente}
              onClick={() => onCambiarFuente(f.valor)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                f.valor === fuente
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="py-4 pl-0 pr-3">
        {peso.puntos.length < 2 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {peso.puntos.length === 0
              ? esConsulta
                ? "No hay mediciones de consulta en este período."
                : "No hay pesos cargados en el diario en este período."
              : "Con dos o más registros de esta fuente vas a ver la curva de evolución."}
          </p>
        ) : !montado ? null : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={serie}
                margin={{ top: 6, right: 12, bottom: 0, left: 0 }}
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
                  axisLine={{ stroke: tema.grilla }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  width={44}
                  tick={{ fill: tema.tinta, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ stroke: tema.tinta, strokeDasharray: "3 3" }}
                  content={(props) => (
                    <TooltipPeso
                      {...props}
                      tema={tema}
                      etiquetaFuente={descriptor.etiqueta}
                    />
                  )}
                />
                <Line
                  name={fuente}
                  type="monotone"
                  dataKey="peso"
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={esConsulta ? "5 3" : undefined}
                  dot={
                    esConsulta
                      ? {
                          r: 5,
                          fill: color,
                          stroke: tema.fondoTooltip,
                          strokeWidth: 1.5,
                        }
                      : { r: 3, fill: color, strokeWidth: 0 }
                  }
                  activeDot={{ r: esConsulta ? 7 : 5 }}
                  isAnimationActive={false}
                />
                {peso.proyeccion && (
                  <Line
                    name="proyeccion"
                    type="monotone"
                    dataKey="proyeccionValor"
                    stroke={tema.tinta}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    connectNulls
                    dot={{
                      r: 3,
                      fill: tema.fondoTooltip,
                      stroke: tema.tinta,
                      strokeWidth: 1.5,
                    }}
                    activeDot={{ r: 5, fill: tema.tinta }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 pt-1">
              <LeyendaFuente
                color={color}
                etiqueta={descriptor.etiqueta}
                detalle={descriptor.detalle}
                punteada={esConsulta}
              />
              {peso.proyeccion && (
                <LeyendaFuente
                  color={tema.tinta}
                  etiqueta="Proyección"
                  detalle="estimación según la tendencia reciente, no es un dato registrado"
                  punteada
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Tooltip de la curva de peso, con contenido a medida en vez del formatter por
 * defecto: el punto donde termina la serie real y arranca la proyección
 * repite su valor en `proyeccionValor` para que el trazo punteado conecte sin
 * salto (ver `serie` en `TarjetaPeso`), y ese valor es el peso MEDIDO, no una
 * estimación — mostrarlo también como "Proyección" ahí confundía al parecer
 * dos números iguales por separado. Se oculta esa entrada duplicada y la
 * proyección solo se etiqueta como tal en el punto realmente proyectado
 * (donde no hay peso medido).
 */
function TooltipPeso({
  active,
  payload,
  label,
  tema,
  etiquetaFuente,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadEntry[];
  label?: string | number;
  tema: {
    tinta: string;
    fondoTooltip: string;
    bordeTooltip: string;
    texto: string;
  };
  etiquetaFuente: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const tienePesoReal = payload.some(
    (item) => item.dataKey === "peso" && item.value != null,
  );
  const entradas = payload.filter((item) => {
    if (item.value == null) return false;
    if (item.dataKey === "proyeccionValor" && tienePesoReal) return false;
    return true;
  });
  if (entradas.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: tema.fondoTooltip,
        border: `1px solid ${tema.bordeTooltip}`,
        borderRadius: 8,
        color: tema.texto,
        fontSize: 12,
        padding: "6px 10px",
      }}
    >
      <p style={{ margin: 0, marginBottom: 4, opacity: 0.7 }}>{label}</p>
      {entradas.map((item) => (
        <p key={String(item.dataKey)} style={{ margin: 0 }}>
          {formatearNumero(item.value as number)} kg ·{" "}
          {item.dataKey === "proyeccionValor"
            ? "Proyección (estimada)"
            : etiquetaFuente}
        </p>
      ))}
    </div>
  );
}

/** Una entrada de la leyenda: su trazo —continuo o punteado— y qué representa. */
function LeyendaFuente({
  color,
  etiqueta,
  detalle,
  punteada,
}: {
  color: string;
  etiqueta: string;
  detalle: string;
  punteada?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">
        <line
          x1="0"
          y1="5"
          x2="22"
          y2="5"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={punteada ? "5 3" : undefined}
        />
        <circle cx="11" cy="5" r={punteada ? 4 : 3} fill={color} />
      </svg>
      <strong className="font-medium text-foreground">{etiqueta}</strong>
      <span>· {detalle}</span>
    </span>
  );
}

// --- Adherencia a los axiomas ------------------------------------------------

function TarjetaAdherencia({
  adherencia,
}: {
  adherencia: {
    axiomaId: string;
    texto: string;
    objetivo: string | null;
    unidad: string | null;
    diasEvaluados: number;
    porcentaje: number | null;
    promedioPaciente: number | null;
  }[];
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-emerald-500/5 p-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          Hábitos y objetivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {adherencia.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay objetivos de hábitos cargados.
          </p>
        ) : (
          adherencia.map((a) => (
            <FilaAdherencia key={a.axiomaId} adherencia={a} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function FilaAdherencia({
  adherencia: a,
}: {
  adherencia: {
    texto: string;
    objetivo: string | null;
    unidad: string | null;
    diasEvaluados: number;
    porcentaje: number | null;
    promedioPaciente: number | null;
  };
}) {
  const evaluable = a.porcentaje != null;
  const bien = (a.porcentaje ?? 0) >= 60;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2 text-sm">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{a.texto}</p>
          <p className="text-xs text-muted-foreground">
            {a.objetivo ? `Objetivo: ${a.objetivo}` : "Guía general"}
            {a.promedioPaciente != null && (
              <>
                {" · "}Tu promedio: {formatearNumero(a.promedioPaciente)}
                {a.unidad ? ` ${a.unidad}` : ""}
              </>
            )}
          </p>
        </div>
        {evaluable && (
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              bien ? "text-primary" : "text-destructive",
            )}
          >
            {a.porcentaje}%
          </span>
        )}
      </div>
      {evaluable ? (
        <BarraProgreso porcentaje={a.porcentaje!} bien={bien} />
      ) : (
        <p className="text-xs italic text-muted-foreground">
          Recomendación informativa (no se mide automáticamente).
        </p>
      )}
    </div>
  );
}

// --- Concordancia con el plan ------------------------------------------------

function TarjetaConcordancia({
  concordancia: c,
}: {
  concordancia: {
    tienePlan: boolean;
    franjasPlanificadas: number;
    diasEvaluados: number;
    coberturaPromedio: number | null;
    porFranja: { franja: string; registrados: number; esperados: number }[];
  };
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-violet-500/5 p-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
            <UtensilsCrossed className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </span>
          Concordancia con el plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {!c.tienePlan || c.franjasPlanificadas === 0 ? (
          <p className="text-sm text-muted-foreground">
            {c.tienePlan
              ? "El plan activo no tiene franjas de comida cargadas."
              : "No hay un plan activo para comparar."}
          </p>
        ) : c.diasEvaluados === 0 ? (
          <p className="text-sm text-muted-foreground">
            Registrá tus comidas para ver qué tanto seguís las franjas del plan.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Cobertura de las franjas del plan
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  (c.coberturaPromedio ?? 0) >= 60
                    ? "text-primary"
                    : "text-destructive",
                )}
              >
                {c.coberturaPromedio}%
              </span>
            </div>
            <BarraProgreso
              porcentaje={c.coberturaPromedio ?? 0}
              bien={(c.coberturaPromedio ?? 0) >= 60}
            />
            <ul className="space-y-1.5 pt-1">
              {c.porFranja.map((f) => {
                const pct =
                  f.esperados > 0
                    ? Math.round((f.registrados / f.esperados) * 100)
                    : 0;
                return (
                  <li
                    key={f.franja}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-28 shrink-0 truncate text-muted-foreground">
                      {f.franja}
                    </span>
                    <BarraProgreso porcentaje={pct} bien={pct >= 60} />
                    <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                      {f.registrados}/{f.esperados} d
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Barra de progreso reutilizable ------------------------------------------

function BarraProgreso({
  porcentaje,
  bien,
}: {
  porcentaje: number;
  bien: boolean;
}) {
  const ancho = Math.max(0, Math.min(100, porcentaje));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          bien ? "bg-primary" : "bg-destructive",
        )}
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}

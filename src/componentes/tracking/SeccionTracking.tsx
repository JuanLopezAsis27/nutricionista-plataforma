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
import {
  aFechaISO,
  formatearFecha,
  formatearNumero,
  hoyLocalISO,
} from "@/lib/formato";
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
] as const;

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
        className="inline-flex rounded-xl border bg-card p-1"
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

      {consulta.isLoading || !datos ? (
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
                datos.peso.variacion != null
                  ? `${datos.peso.variacion > 0 ? "+" : ""}${formatearNumero(datos.peso.variacion)}`
                  : "—"
              }
              unidad={datos.peso.variacion != null ? "kg" : undefined}
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
          <TarjetaPeso peso={datos.peso} />
          <TarjetaAdherencia adherencia={datos.adherencia} />
          <TarjetaConcordancia concordancia={datos.concordancia} />
          {esNutri && (
            <p className="text-xs text-muted-foreground">
              La curva de peso cruza las dos fuentes: lo que el paciente carga
              en su diario y el peso de cada medición de consulta, cada uno con
              su trazo. El resto de las medidas de consulta —pliegues,
              perímetros, masas y somatotipo— está en la pestaña
              «Antropometría».
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
 * La curva de peso, con las DOS fuentes separadas.
 *
 * El peso llega de dos lados —lo que el paciente carga en su diario y lo que
 * se mide en la consulta— y era una sola línea de puntos indistinguibles. No
 * es un detalle de estilo: la balanza de casa a la mañana y la del consultorio
 * a la tarde no miden lo mismo, así que un escalón entre dos puntos puede ser
 * el paciente o puede ser el cambio de balanza. Sin saber cuál es cuál, ese
 * escalón se lee como progreso (o retroceso) real.
 *
 * Se distinguen por tres cosas a la vez y no solo por color: la de consulta va
 * punteada, con puntos más grandes, y la leyenda las nombra.
 */
function TarjetaPeso({
  peso,
}: {
  peso: {
    puntos: { fecha: Date; peso: number; fuente: "DIARIO" | "CONSULTA" }[];
    inicial: number | null;
    actual: number | null;
    variacion: number | null;
  };
}) {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const oscuro = resolvedTheme === "dark";
  const tema = oscuro ? TEMAS.dark : TEMAS.light;
  const colorConsulta = oscuro
    ? TEMAS_GRAFICO.dark.total
    : TEMAS_GRAFICO.light.total;

  // Un día puede tener las dos fuentes (se pesó en casa Y vino a consulta):
  // van en la MISMA fila para caer sobre la misma marca del eje X, cada una en
  // su serie. Con una fila por punto, ese día aparecería dos veces en el eje.
  const serie = useMemo(() => {
    const porFecha = new Map<
      string,
      { fecha: string; diario: number | null; consulta: number | null }
    >();
    for (const punto of peso.puntos) {
      const clave = aFechaISO(punto.fecha);
      const fila = porFecha.get(clave) ?? {
        fecha: formatearFecha(punto.fecha),
        diario: null,
        consulta: null,
      };
      if (punto.fuente === "CONSULTA") fila.consulta = punto.peso;
      else fila.diario = punto.peso;
      porFecha.set(clave, fila);
    }
    return [...porFecha.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, fila]) => fila);
  }, [peso.puntos]);

  const hayDiario = peso.puntos.some((p) => p.fuente === "DIARIO");
  const hayConsulta = peso.puntos.some((p) => p.fuente === "CONSULTA");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-rose-500/5 p-4">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
              <TrendingUp className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </span>
            Peso registrado
          </span>
          {peso.variacion != null && (
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                peso.variacion <= 0 ? "text-primary" : "text-muted-foreground",
              )}
            >
              {peso.variacion > 0 ? "+" : ""}
              {formatearNumero(peso.variacion)} kg
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4 pl-0 pr-3">
        {peso.puntos.length < 2 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            Con dos o más registros de peso vas a ver la curva de evolución.
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
                  contentStyle={{
                    backgroundColor: tema.fondoTooltip,
                    border: `1px solid ${tema.bordeTooltip}`,
                    borderRadius: 8,
                    color: tema.texto,
                    fontSize: 12,
                  }}
                  formatter={(valor, nombre) => [
                    `${formatearNumero(valor as number)} kg`,
                    nombre === "consulta" ? "En consulta" : "En tu diario",
                  ]}
                />
                {/* `connectNulls`: cada serie une SUS puntos salteando los días
                    en los que registró la otra. Sin eso, la de consulta —que
                    tiene un punto cada varias semanas— quedaría en puntos
                    sueltos, sin línea que los una. */}
                <Line
                  name="diario"
                  type="monotone"
                  dataKey="diario"
                  connectNulls
                  stroke={tema.peso}
                  strokeWidth={2}
                  dot={{ r: 3, fill: tema.peso, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
                <Line
                  name="consulta"
                  type="monotone"
                  dataKey="consulta"
                  connectNulls
                  stroke={colorConsulta}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{
                    r: 5,
                    fill: colorConsulta,
                    stroke: tema.fondoTooltip,
                    strokeWidth: 1.5,
                  }}
                  activeDot={{ r: 7 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 pt-1">
              {hayDiario && (
                <LeyendaFuente
                  color={tema.peso}
                  etiqueta="En el diario"
                  detalle="lo que se registra en casa"
                />
              )}
              {hayConsulta && (
                <LeyendaFuente
                  color={colorConsulta}
                  etiqueta="En consulta"
                  detalle="lo que se midió en el consultorio"
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

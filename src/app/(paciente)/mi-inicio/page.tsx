"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  GlassWater,
  MessageSquare,
  NotebookPen,
  Plus,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { useDiario } from "@/lib/hooks/useDiario";
import { useObjetivos } from "@/lib/hooks/useObjetivos";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { useEsCliente } from "@/lib/hooks/useEsCliente";
import {
  diaSemanaDe,
  ETIQUETA_DIA_LARGA,
} from "@/dominio/entidades/PlanSemanal";
import type { PlanSemanalDelPacienteDto } from "@/aplicacion/dtos/planSemanal.dto";
import { formatearFechaLarga, aFechaISO, hoyLocalISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  textoDeComida,
  macrosEnLinea,
} from "@/componentes/planes-semanales/textoComida";
import {
  VasosDeAgua,
  textoDeAgua,
  ML_POR_VASO,
} from "@/componentes/comunes/VasosDeAgua";

/** Hora local HH:mm actual (para ubicar la franja del plan). */
function horaAhora(): string {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** El saludo del encabezado según la hora local de quien mira. */
function saludoSegunHora(hora: number): string {
  if (hora < 6) return "Buenas noches";
  if (hora < 13) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function PaginaMiInicio() {
  const { miPlan } = usePlanes();
  const { miPlanSemanal } = usePlanesSemanales();
  const { porPaciente } = useTurnos();
  const { miDia, guardarMiDia } = useDiario();
  const { mios } = useObjetivos();
  const { misNoLeidos } = useMensajeria();

  const hoy = new Date(hoyLocalISO());
  const plan = miPlan();
  const semanal = miPlanSemanal();
  const turnos = porPaciente({});
  const dia = miDia({ fecha: hoy });
  const objetivos = mios();
  const sinLeer = misNoLeidos().data ?? 0;

  // --- Próximo turno ---
  const hoyISO = aFechaISO(hoy);
  const proximo = (turnos.data ?? [])
    .filter((t) => aFechaISO(t.fecha) >= hoyISO && t.estado !== "CANCELADO")
    .sort(
      (a, b) =>
        aFechaISO(a.fecha).localeCompare(aFechaISO(b.fecha)) ||
        a.hora.localeCompare(b.hora),
    )[0];

  // --- Franja actual (o próxima) del plan ---
  const ahora = horaAhora();
  const comidas = plan.data?.comidas ?? [];
  const franjaActual =
    comidas.find(
      (c) =>
        c.horaDesde &&
        c.horaHasta &&
        c.horaDesde <= ahora &&
        ahora <= c.horaHasta,
    ) ??
    comidas
      .filter((c) => c.horaDesde && c.horaDesde >= ahora)
      .sort((a, b) =>
        (a.horaDesde ?? "").localeCompare(b.horaDesde ?? ""),
      )[0] ??
    comidas[0];

  const enCurso = (objetivos.data ?? []).filter((o) => o.estado === "EN_CURSO");

  return (
    <div className="space-y-5">
      <Encabezado
        fecha={hoy}
        proximoTurno={
          proximo
            ? {
                fecha: proximo.fecha,
                hora: proximo.hora,
                duracionMinutos: proximo.duracionMinutos,
              }
            : null
        }
        cargandoTurno={turnos.isLoading}
      />

      <AccesosRapidos sinLeer={sinLeer} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TarjetaPlanAhora
          cargando={plan.isLoading}
          franja={
            franjaActual
              ? {
                  nombre: franjaActual.nombre,
                  horaDesde: franjaActual.horaDesde,
                  horaHasta: franjaActual.horaHasta,
                  contenido: franjaActual.opciones[0]?.contenido ?? null,
                }
              : null
          }
        />
        <TarjetaMenuDeHoy cargando={semanal.isLoading} datos={semanal.data} />
      </div>

      <RegistroRapido
        fecha={hoy}
        pesoActual={dia.data?.pesoKg ?? null}
        aguaActual={dia.data?.aguaMl ?? null}
        cargando={dia.isLoading}
        guardando={guardarMiDia.isPending}
        onGuardar={(cambios) =>
          guardarMiDia.mutate({
            fecha: hoy,
            pesoKg: dia.data?.pesoKg ?? null,
            aguaMl: dia.data?.aguaMl ?? null,
            horasSueno: dia.data?.horasSueno ?? null,
            calidadSueno: dia.data?.calidadSueno ?? null,
            notas: dia.data?.notas ?? null,
            ...cambios,
          })
        }
      />

      {enCurso.length > 0 && (
        <TarjetaObjetivos
          objetivos={enCurso.map((objetivo) => ({
            id: objetivo.id,
            titulo: objetivo.titulo,
          }))}
        />
      )}
    </div>
  );
}

/**
 * El encabezado del portal: saludo, fecha y el próximo turno.
 *
 * El próximo turno vive acá y ya no en una card propia: es un dato de una
 * línea que se mira de reojo, y darle una tarjeta entera lo ponía al mismo
 * nivel que el plan del día —que es lo que el paciente viene a ver—.
 */
function Encabezado({
  fecha,
  proximoTurno,
  cargandoTurno,
}: {
  fecha: Date;
  proximoTurno: {
    fecha: Date | string;
    hora: string;
    duracionMinutos: number;
  } | null;
  cargandoTurno: boolean;
}) {
  // El saludo depende de la hora del que mira, y el servidor no la conoce
  // (ver `useEsCliente`): hasta hidratar se saluda sin hora.
  const esCliente = useEsCliente();
  const saludo = esCliente ? saludoSegunHora(new Date().getHours()) : "Hola";

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-5 sm:p-6">
      <div
        className="patron-puntos pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            <span className="capitalize">{formatearFechaLarga(fecha)}</span>
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">{saludo}</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Todo lo tuyo en un lugar: tu plan, el menú de la semana y lo que vas
            registrando.
          </p>
        </div>

        {cargandoTurno ? (
          <Skeleton className="h-16 w-56" />
        ) : proximoTurno ? (
          <Link
            href="/mis-turnos"
            className="group flex items-center gap-3 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur transition-colors hover:border-primary/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">
                Próximo turno
              </span>
              <span className="block truncate text-sm font-semibold capitalize">
                {formatearFechaLarga(proximoTurno.fecha)}
              </span>
              <span className="block text-xs tabular-nums text-muted-foreground">
                {proximoTurno.hora} · {proximoTurno.duracionMinutos} min
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <Link
            href="/mis-turnos"
            className="flex items-center gap-2 rounded-xl border border-dashed bg-card/60 px-4 py-3 text-sm text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <CalendarClock className="h-4 w-4" />
            No tenés turnos próximos
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * Los accesos rápidos.
 *
 * Cada destino lleva SU color, siempre el mismo: en una grilla de ocho
 * baldosas iguales hay que leer las ocho etiquetas para encontrar una, y el
 * portal se abre todos los días para ir casi siempre al mismo lado. El color
 * acompaña al ícono y a la etiqueta, nunca reemplaza a ninguno de los dos.
 */
const ACCESOS: {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  fondo: string;
  texto: string;
}[] = [
  {
    href: "/mi-plan",
    etiqueta: "Mi plan",
    icono: ClipboardList,
    fondo: "bg-emerald-500/10 group-hover:border-emerald-500/40",
    texto: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/mi-semana",
    etiqueta: "Mi semana",
    icono: CalendarRange,
    fondo: "bg-violet-500/10 group-hover:border-violet-500/40",
    texto: "text-violet-600 dark:text-violet-400",
  },
  {
    href: "/mi-diario",
    etiqueta: "Mi diario",
    icono: NotebookPen,
    fondo: "bg-amber-500/10 group-hover:border-amber-500/40",
    texto: "text-amber-600 dark:text-amber-400",
  },
  {
    href: "/mensajes",
    etiqueta: "Mensajes",
    icono: MessageSquare,
    fondo: "bg-sky-500/10 group-hover:border-sky-500/40",
    texto: "text-sky-600 dark:text-sky-400",
  },
  {
    href: "/mi-progreso",
    etiqueta: "Mi progreso",
    icono: TrendingUp,
    fondo: "bg-rose-500/10 group-hover:border-rose-500/40",
    texto: "text-rose-600 dark:text-rose-400",
  },
  {
    href: "/mis-turnos",
    etiqueta: "Mis turnos",
    icono: CalendarDays,
    fondo: "bg-indigo-500/10 group-hover:border-indigo-500/40",
    texto: "text-indigo-600 dark:text-indigo-400",
  },
  {
    href: "/mis-recetas",
    etiqueta: "Mis recetas",
    icono: BookOpen,
    fondo: "bg-orange-500/10 group-hover:border-orange-500/40",
    texto: "text-orange-600 dark:text-orange-400",
  },
  {
    href: "/asistente",
    etiqueta: "Asistente",
    icono: Sparkles,
    fondo: "bg-cyan-500/10 group-hover:border-cyan-500/40",
    texto: "text-cyan-600 dark:text-cyan-400",
  },
];

function AccesosRapidos({ sinLeer }: { sinLeer: number }) {
  return (
    <nav aria-label="Accesos rápidos">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ACCESOS.map((acceso) => {
          const Icono = acceso.icono;
          const badge = acceso.href === "/mensajes" && sinLeer > 0;
          return (
            <Link
              key={acceso.href}
              href={acceso.href}
              className="group relative flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md sm:flex-col sm:gap-2 sm:py-4 sm:text-center"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  acceso.fondo,
                )}
              >
                <Icono className={cn("h-5 w-5", acceso.texto)} />
              </span>
              <span className="text-sm font-medium leading-tight">
                {acceso.etiqueta}
              </span>
              {badge && (
                <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {sinLeer > 9 ? "9+" : sinLeer}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** La franja del plan (día tipo) que corresponde a esta hora, o la que sigue. */
function TarjetaPlanAhora({
  cargando,
  franja,
}: {
  cargando: boolean;
  franja: {
    nombre: string;
    horaDesde: string | null;
    horaHasta: string | null;
    contenido: string | null;
  } | null;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-emerald-500/5 p-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <UtensilsCrossed className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          Tu plan ahora
        </CardTitle>
        {franja?.horaDesde && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {franja.horaDesde}
            {franja.horaHasta ? `–${franja.horaHasta}` : ""}
          </span>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {cargando ? (
          <Skeleton className="h-16 w-full" />
        ) : franja ? (
          <div className="space-y-2">
            <p className="font-semibold">{franja.nombre}</p>
            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {franja.contenido ?? "Sin opciones cargadas."}
            </p>
            <Button asChild variant="link" size="sm" className="h-auto px-0">
              <Link href="/mi-plan">
                Ver plan completo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés un plan asignado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Lo que toca HOY según el menú semanal.
 *
 * Es la comida principal de cada franja de este día; las alternativas y el
 * resto de la semana están en «Mi semana». Acá no van porque el inicio
 * responde «qué me toca ahora», no «cómo es mi semana».
 */
function TarjetaMenuDeHoy({
  cargando,
  datos,
}: {
  cargando: boolean;
  datos: PlanSemanalDelPacienteDto | null | undefined;
}) {
  // Qué día es hoy lo dice el reloj del paciente, no el del servidor.
  const esCliente = useEsCliente();
  const diaHoy = esCliente ? diaSemanaDe(new Date()) : null;
  const plan = datos?.plan;

  const principales = (diaHoy ? (plan?.franjas ?? []) : [])
    .map((franja) => ({
      id: franja.id,
      nombre: franja.nombre,
      horaDesde: franja.horaDesde,
      comida: franja.comidas
        .filter((c) => c.dia === diaHoy)
        .sort((a, b) => a.orden - b.orden)[0],
    }))
    .filter(
      (
        fila,
      ): fila is typeof fila & {
        comida: NonNullable<(typeof fila)["comida"]>;
      } => fila.comida != null,
    );

  const total = plan?.totalesPorDia.find((t) => t.dia === diaHoy)?.macros;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-violet-500/5 p-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
            <CalendarRange className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </span>
          Tu menú de hoy
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {diaHoy ? ETIQUETA_DIA_LARGA[diaHoy] : ""}
        </span>
      </CardHeader>
      <CardContent className="p-4">
        {cargando ? (
          <Skeleton className="h-16 w-full" />
        ) : principales.length > 0 ? (
          <div className="space-y-2">
            <ul className="divide-y">
              {principales.slice(0, 4).map((fila) => (
                <li key={fila.id} className="flex gap-3 py-2 first:pt-0">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                    {fila.nombre}
                    {fila.horaDesde && (
                      <span className="block tabular-nums">
                        {fila.horaDesde}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-sm">
                      {textoDeComida(fila.comida)}
                    </span>
                    {macrosEnLinea(fila.comida.macros) && (
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {macrosEnLinea(fila.comida.macros)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {total?.calorias != null && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  Total del día: {total.calorias} kcal
                </span>
              )}
              <Button asChild variant="link" size="sm" className="h-auto px-0">
                <Link href="/mi-semana">
                  Ver la semana <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : datos ? (
          <p className="text-sm text-muted-foreground">
            Tu menú semanal no tiene comidas cargadas para hoy.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés un menú semanal asignado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Los objetivos en curso, para no perderlos de vista desde el inicio. */
function TarjetaObjetivos({
  objetivos,
}: {
  objetivos: { id: string; titulo: string }[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-4 w-4 text-primary" />
          </span>
          Tus objetivos
        </CardTitle>
        <Button asChild variant="link" size="sm" className="h-auto px-0">
          <Link href="/mis-objetivos">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ul className="flex flex-wrap gap-2">
          {objetivos.slice(0, 4).map((objetivo) => (
            <li
              key={objetivo.id}
              className="rounded-full border bg-secondary/50 px-3 py-1.5 text-sm"
            >
              {objetivo.titulo}
            </li>
          ))}
          {objetivos.length > 4 && (
            <li className="rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground">
              +{objetivos.length - 4} más
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function RegistroRapido({
  fecha,
  pesoActual,
  aguaActual,
  cargando,
  guardando,
  onGuardar,
}: {
  fecha: Date;
  pesoActual: number | null;
  aguaActual: number | null;
  cargando: boolean;
  guardando: boolean;
  onGuardar: (cambios: {
    pesoKg?: number | null;
    aguaMl?: number | null;
  }) => void;
}) {
  const [peso, setPeso] = useState("");
  useEffect(() => {
    setPeso(pesoActual != null ? String(pesoActual) : "");
  }, [pesoActual, fecha]);

  const agua = aguaActual ?? 0;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Registro rápido de hoy</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 pt-2 sm:grid-cols-2 sm:gap-8">
        {/* Peso */}
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
              <Scale className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </span>
            Peso
            {pesoActual != null && (
              <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                {pesoActual} kg hoy
              </span>
            )}
          </p>
          {cargando ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="kg"
                aria-label="Peso en kilos"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
              <Button
                onClick={() => {
                  const valor = peso.trim() === "" ? null : Number(peso);
                  if (
                    valor != null &&
                    (Number.isNaN(valor) || valor < 20 || valor > 400)
                  )
                    return;
                  onGuardar({ pesoKg: valor });
                }}
                disabled={guardando}
              >
                Guardar
              </Button>
            </div>
          )}
        </div>

        {/* Agua. Se cuenta en vasos porque es como se toma; el total en ml va
            al lado, que es como lo lee el nutricionista. */}
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10">
              <GlassWater className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </span>
            Agua
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {textoDeAgua(agua)}
            </span>
          </p>
          {cargando ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-2">
              <VasosDeAgua ml={agua} />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={guardando}
                  onClick={() => onGuardar({ aguaMl: agua + ML_POR_VASO })}
                >
                  <Plus className="h-4 w-4" />1 vaso
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={guardando}
                  onClick={() => onGuardar({ aguaMl: agua + 500 })}
                >
                  +500 ml
                </Button>
                {agua > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={guardando}
                    onClick={() => onGuardar({ aguaMl: 0 })}
                  >
                    Reiniciar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

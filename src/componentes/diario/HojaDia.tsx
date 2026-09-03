"use client";

import { useEffect, useState } from "react";
import {
  GlassWater,
  Scale,
  Moon,
  UtensilsCrossed,
  Dumbbell,
  Trash2,
  Camera,
  ExternalLink,
  NotebookPen,
  Plus,
  Check,
  type LucideIcon,
} from "lucide-react";
import {
  FRANJAS_SUGERIDAS,
  INTENSIDADES_ACTIVIDAD,
  CALIDADES_SUENO,
  type CalidadSueno,
  type IntensidadActividad,
} from "@/dominio/entidades/RegistroDiario";
import { useDiario } from "@/lib/hooks/useDiario";
import { formatearFechaLarga } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import {
  VasosDeAgua,
  textoDeAgua,
  ML_POR_VASO,
} from "@/componentes/comunes/VasosDeAgua";

const ETIQUETAS_CALIDAD: Record<CalidadSueno, string> = {
  MALA: "Mala",
  REGULAR: "Regular",
  BUENA: "Buena",
};

const ETIQUETAS_INTENSIDAD: Record<IntensidadActividad, string> = {
  BAJA: "Baja",
  MODERADA: "Moderada",
  ALTA: "Alta",
};

/** "" → undefined; coma decimal aceptada. */
function aNumero(valor: string): number | undefined {
  const limpio = valor.trim().replace(",", ".");
  if (limpio === "") return undefined;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : undefined;
}

/**
 * Hoja del día del diario: peso, agua, sueño y notas, más las comidas (con
 * foto) y las actividades.
 *
 * Los escalares del día se guardan con un botón y el resto se guarda solo (una
 * comida se agrega, una actividad se agrega). Esa mezcla es la que hace fácil
 * perder lo escrito, así que el botón avisa cuándo hay algo sin guardar en vez
 * de quedarse siempre igual: es el único lugar del portal donde escribir no
 * alcanza.
 */
export function HojaDia({ fechaISO }: { fechaISO: string }) {
  const {
    miDia,
    guardarMiDia,
    agregarComida,
    eliminarComida,
    agregarActividad,
    eliminarActividad,
    agregarFotoComida,
  } = useDiario();

  // "YYYY-MM-DD" → Date a medianoche UTC (así lo persiste la columna @db.Date).
  const fecha = new Date(fechaISO);
  const dia = miDia({ fecha });
  const registro = dia.data;

  // Escalares (controlados; se re-cargan al cambiar de día)
  const [peso, setPeso] = useState("");
  const [agua, setAgua] = useState(0);
  const [horasSueno, setHorasSueno] = useState("");
  const [calidadSueno, setCalidadSueno] = useState<CalidadSueno | "">("");
  const [notas, setNotas] = useState("");

  // Alta de comida
  const [franja, setFranja] = useState<string>("Desayuno");
  const [horaComida, setHoraComida] = useState("");
  const [descripcionComida, setDescripcionComida] = useState("");
  const [porcionComida, setPorcionComida] = useState("");
  const [fotoPara, setFotoPara] = useState<string | null>(null);

  // Alta de actividad
  const [tipoActividad, setTipoActividad] = useState("");
  const [duracion, setDuracion] = useState("");
  const [intensidad, setIntensidad] = useState<IntensidadActividad | "">("");

  useEffect(() => {
    setPeso(registro?.pesoKg != null ? String(registro.pesoKg) : "");
    setAgua(registro?.aguaMl ?? 0);
    setHorasSueno(
      registro?.horasSueno != null ? String(registro.horasSueno) : "",
    );
    setCalidadSueno(registro?.calidadSueno ?? "");
    setNotas(registro?.notas ?? "");
    setFotoPara(null);
  }, [registro, fechaISO]);

  if (dia.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  // Lo escrito contra lo guardado: es lo que decide si el botón avisa.
  const hayCambios =
    (aNumero(peso) ?? null) !== (registro?.pesoKg ?? null) ||
    (agua > 0 ? agua : null) !== (registro?.aguaMl ?? null) ||
    (aNumero(horasSueno) ?? null) !== (registro?.horasSueno ?? null) ||
    (calidadSueno || null) !== (registro?.calidadSueno ?? null) ||
    (notas.trim() || null) !== (registro?.notas ?? null);

  function guardarEscalares() {
    guardarMiDia.mutate({
      fecha,
      pesoKg: aNumero(peso) ?? null,
      aguaMl: agua > 0 ? agua : null,
      horasSueno: aNumero(horasSueno) ?? null,
      calidadSueno: calidadSueno || null,
      notas: notas.trim() || null,
    });
  }

  function registrarComida() {
    agregarComida.mutate(
      {
        fecha,
        franja,
        hora: horaComida || null,
        descripcion: descripcionComida,
        porcion: porcionComida.trim() || null,
      },
      {
        onSuccess: () => {
          setDescripcionComida("");
          setHoraComida("");
          setPorcionComida("");
        },
      },
    );
  }

  function registrarActividad() {
    const minutos = aNumero(duracion);
    if (!minutos) return;
    agregarActividad.mutate(
      {
        fecha,
        tipo: tipoActividad,
        duracionMinutos: Math.round(minutos),
        intensidad: intensidad || null,
      },
      {
        onSuccess: () => {
          setTipoActividad("");
          setDuracion("");
          setIntensidad("");
        },
      },
    );
  }

  const comidas = registro?.comidas ?? [];
  const actividades = registro?.actividades ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold capitalize">
        {formatearFechaLarga(fechaISO)}
      </h2>

      {/* Escalares del día */}
      <Card className="overflow-hidden">
        <CabeceraSeccion
          icono={NotebookPen}
          titulo="Mi día"
          fondo="bg-primary/5"
          tinte="bg-primary/10"
          color="text-primary"
        />
        <CardContent className="space-y-5 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Scale className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                Peso (kg)
              </Label>
              <Input
                inputMode="decimal"
                placeholder="—"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Sueño (horas)
              </Label>
              <Input
                inputMode="decimal"
                placeholder="—"
                value={horasSueno}
                onChange={(e) => setHorasSueno(e.target.value)}
              />
              {/* Tres opciones no necesitan un desplegable: en un teléfono son
                  dos toques donde alcanza con uno, y acá se ven las tres. */}
              <div
                className="flex gap-1.5 pt-0.5"
                role="group"
                aria-label="Calidad del sueño"
              >
                {CALIDADES_SUENO.map((calidad) => {
                  const activa = calidadSueno === calidad;
                  return (
                    <button
                      key={calidad}
                      type="button"
                      aria-pressed={activa}
                      onClick={() => setCalidadSueno(activa ? "" : calidad)}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                        activa
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                          : "text-muted-foreground hover:border-indigo-500/40 hover:text-foreground",
                      )}
                    >
                      {ETIQUETAS_CALIDAD[calidad]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border bg-sky-500/5 p-3">
            <Label className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
              <GlassWater className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Agua
              <span className="ml-auto tabular-nums text-muted-foreground">
                {textoDeAgua(agua)}
              </span>
            </Label>
            <VasosDeAgua ml={agua} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setAgua(agua + ML_POR_VASO)}
              >
                <Plus className="h-4 w-4" />1 vaso
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAgua(agua + 500)}
              >
                +500 ml
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setAgua(0)}
                disabled={agua === 0}
              >
                Reiniciar
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notas del día</Label>
            <Textarea
              rows={2}
              placeholder="Cómo te sentiste, qué te costó, qué salió bien…"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {hayCambios ? (
              <span className="mr-auto text-xs text-muted-foreground">
                Tenés cambios sin guardar.
              </span>
            ) : (
              registro && (
                <span className="mr-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Todo guardado.
                </span>
              )
            )}
            <Button
              onClick={guardarEscalares}
              disabled={guardarMiDia.isPending || !hayCambios}
            >
              {guardarMiDia.isPending ? "Guardando…" : "Guardar mi día"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comidas */}
      <Card className="overflow-hidden">
        <CabeceraSeccion
          icono={UtensilsCrossed}
          titulo="Comidas"
          cantidad={comidas.length}
          fondo="bg-emerald-500/5"
          tinte="bg-emerald-500/10"
          color="text-emerald-600 dark:text-emerald-400"
        />
        <CardContent className="space-y-3 p-4">
          {comidas.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Todavía no cargaste comidas de este día.
            </p>
          )}

          {comidas.map((comida) => (
            <div
              key={comida.id}
              className="rounded-xl border border-l-4 border-l-emerald-500/60 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 font-medium">
                    {comida.franja}
                    {comida.hora && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {comida.hora}
                      </span>
                    )}
                    {comida.porcion && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        {comida.porcion}
                      </span>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap pt-0.5 text-muted-foreground">
                    {comida.descripcion}
                  </p>
                </div>
                <span className="flex shrink-0 gap-0.5">
                  {comida.fotoArchivoId ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label="Ver foto"
                    >
                      <a
                        href={`/api/archivos/${comida.fotoArchivoId}/ver`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Agregar foto"
                      onClick={() =>
                        setFotoPara(fotoPara === comida.id ? null : comida.id)
                      }
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar comida"
                    onClick={() => eliminarComida.mutate({ id: comida.id })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </span>
              </div>
              {fotoPara === comida.id && (
                <SubidorArchivo
                  className="mt-2"
                  contexto="foto-comida"
                  accept="image/*"
                  onSubido={(archivo) => {
                    agregarFotoComida.mutate({
                      comidaId: comida.id,
                      archivoId: archivo.id,
                    });
                    setFotoPara(null);
                  }}
                />
              )}
            </div>
          ))}

          <div className="space-y-2 rounded-xl border border-dashed bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Agregar una comida
            </p>
            <div className="grid gap-2 sm:grid-cols-[10rem_6rem_1fr]">
              <Select value={franja} onValueChange={setFranja}>
                <SelectTrigger aria-label="Franja">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRANJAS_SUGERIDAS.map((sugerida) => (
                    <SelectItem key={sugerida} value={sugerida}>
                      {sugerida}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="time"
                aria-label="Hora"
                value={horaComida}
                onChange={(e) => setHoraComida(e.target.value)}
              />
              <Input
                aria-label="Porción"
                placeholder="Porción (ej. 1 plato, 200 g)"
                value={porcionComida}
                onChange={(e) => setPorcionComida(e.target.value)}
              />
            </div>
            <Textarea
              rows={2}
              placeholder="¿Qué comiste? Detallá lo más posible (ingredientes, cantidades, preparación)…"
              value={descripcionComida}
              onChange={(e) => setDescripcionComida(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={registrarComida}
                disabled={agregarComida.isPending || !descripcionComida.trim()}
              >
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actividad física */}
      <Card className="overflow-hidden">
        <CabeceraSeccion
          icono={Dumbbell}
          titulo="Actividad física"
          cantidad={actividades.length}
          fondo="bg-violet-500/5"
          tinte="bg-violet-500/10"
          color="text-violet-600 dark:text-violet-400"
        />
        <CardContent className="space-y-3 p-4">
          {actividades.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Sin actividad registrada este día.
            </p>
          )}

          {actividades.map((actividad) => (
            <div
              key={actividad.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-l-4 border-l-violet-500/60 p-3 text-sm"
            >
              <p>
                <span className="font-medium">{actividad.tipo}</span> ·{" "}
                <span className="tabular-nums">
                  {actividad.duracionMinutos} min
                </span>
                {actividad.intensidad
                  ? ` · intensidad ${ETIQUETAS_INTENSIDAD[actividad.intensidad].toLowerCase()}`
                  : ""}
              </p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Eliminar actividad"
                onClick={() => eliminarActividad.mutate({ id: actividad.id })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <div className="space-y-2 rounded-xl border border-dashed bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Agregar actividad
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_7rem_9rem_auto]">
              <Input
                placeholder="Pesas, running, fútbol…"
                value={tipoActividad}
                onChange={(e) => setTipoActividad(e.target.value)}
              />
              <Input
                inputMode="numeric"
                placeholder="Minutos"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
              />
              <Select
                value={intensidad}
                onValueChange={(v) => setIntensidad(v as IntensidadActividad)}
              >
                <SelectTrigger aria-label="Intensidad">
                  <SelectValue placeholder="Intensidad" />
                </SelectTrigger>
                <SelectContent>
                  {INTENSIDADES_ACTIVIDAD.map((nivel) => (
                    <SelectItem key={nivel} value={nivel}>
                      {ETIQUETAS_INTENSIDAD[nivel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={registrarActividad}
                disabled={
                  agregarActividad.isPending ||
                  !tipoActividad.trim() ||
                  !aNumero(duracion)
                }
              >
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Cabecera de una de las tres secciones del día, con su color y su contador. */
function CabeceraSeccion({
  icono: Icono,
  titulo,
  cantidad,
  fondo,
  tinte,
  color,
}: {
  icono: LucideIcon;
  titulo: string;
  cantidad?: number;
  fondo: string;
  tinte: string;
  color: string;
}) {
  return (
    <CardHeader
      className={cn(
        "flex-row items-center justify-between space-y-0 border-b p-4",
        fondo,
      )}
    >
      <CardTitle className="flex items-center gap-2 text-base">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tinte,
          )}
        >
          <Icono className={cn("h-4 w-4", color)} />
        </span>
        {titulo}
      </CardTitle>
      {cantidad != null && cantidad > 0 && (
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold tabular-nums">
          {cantidad}
        </span>
      )}
    </CardHeader>
  );
}

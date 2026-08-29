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
 * Hoja del día del diario: peso, agua (con botones rápidos), sueño y notas,
 * más las comidas (con foto) y actividades del día.
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

  return (
    <div className="space-y-4">
      <h2 className="font-semibold capitalize">
        {formatearFechaLarga(fechaISO)}
      </h2>

      {/* Escalares del día */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mi día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Scale className="h-4 w-4" /> Peso (kg)
              </Label>
              <Input
                inputMode="decimal"
                placeholder="—"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Moon className="h-4 w-4" /> Sueño (horas)
              </Label>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  placeholder="—"
                  value={horasSueno}
                  onChange={(e) => setHorasSueno(e.target.value)}
                />
                <Select
                  value={calidadSueno}
                  onValueChange={(v) => setCalidadSueno(v as CalidadSueno)}
                >
                  <SelectTrigger
                    className="w-28"
                    aria-label="Calidad del sueño"
                  >
                    <SelectValue placeholder="Calidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALIDADES_SUENO.map((calidad) => (
                      <SelectItem key={calidad} value={calidad}>
                        {ETIQUETAS_CALIDAD[calidad]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <GlassWater className="h-4 w-4" /> Agua: {agua} ml
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAgua(agua + 250)}
              >
                +250 ml
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
                onClick={() => setAgua(0)}
                disabled={agua === 0}
              >
                Reiniciar
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Notas del día</Label>
            <Textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={guardarEscalares}
              disabled={guardarMiDia.isPending}
            >
              {guardarMiDia.isPending ? "Guardando…" : "Guardar mi día"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UtensilsCrossed className="h-5 w-5 text-primary" /> Comidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(registro?.comidas ?? []).map((comida) => (
            <div key={comida.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {comida.franja}
                    {comida.hora ? ` · ${comida.hora}` : ""}
                    {comida.porcion ? (
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {comida.porcion}
                      </span>
                    ) : null}
                  </p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {comida.descripcion}
                  </p>
                </div>
                <span className="flex gap-0.5">
                  {comida.fotoArchivoId ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label="Ver foto"
                    >
                      <a
                        href={`/api/archivos/${comida.fotoArchivoId}`}
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

          <div className="space-y-2 rounded-md border border-dashed p-3">
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
                Agregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actividad física */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-5 w-5 text-primary" /> Actividad física
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(registro?.actividades ?? []).map((actividad) => (
            <div
              key={actividad.id}
              className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <p>
                <span className="font-medium">{actividad.tipo}</span> ·{" "}
                {actividad.duracionMinutos} min
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

          <div className="grid gap-2 rounded-md border border-dashed p-3 sm:grid-cols-[1fr_7rem_9rem_auto]">
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
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

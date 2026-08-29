"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  UtensilsCrossed,
  Scale,
  GlassWater,
  NotebookPen,
  MessageSquare,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { useDiario } from "@/lib/hooks/useDiario";
import { formatearFechaLarga, aFechaISO, hoyLocalISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";

/** Hora local HH:mm actual (para ubicar la franja del plan). */
function horaAhora(): string {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function PaginaMiInicio() {
  const { miPlan } = usePlanes();
  const { porPaciente } = useTurnos();
  const { miDia, guardarMiDia } = useDiario();

  const hoy = new Date(hoyLocalISO());
  const plan = miPlan();
  const turnos = porPaciente({});
  const dia = miDia({ fecha: hoy });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hoy</h1>
        <p className="text-sm capitalize text-muted-foreground">
          {formatearFechaLarga(hoy)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Próximo turno */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-primary" /> Próximo turno
            </CardTitle>
          </CardHeader>
          <CardContent>
            {turnos.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : proximo ? (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium capitalize">
                    {formatearFechaLarga(proximo.fecha)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {proximo.hora} · {proximo.duracionMinutos} min
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/mis-turnos">Ver turnos</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tenés turnos próximos.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Franja actual del plan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UtensilsCrossed className="h-5 w-5 text-primary" /> Tu plan ahora
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plan.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : franjaActual ? (
              <div className="space-y-1">
                <p className="font-medium">
                  {franjaActual.nombre}
                  {franjaActual.horaDesde && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {franjaActual.horaDesde}
                      {franjaActual.horaHasta
                        ? `–${franjaActual.horaHasta}`
                        : ""}
                    </span>
                  )}
                </p>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {franjaActual.opciones[0]?.contenido ??
                    "Sin opciones cargadas."}
                </p>
                <Button
                  asChild
                  variant="link"
                  size="sm"
                  className="h-auto px-0"
                >
                  <Link href="/mi-plan">Ver plan completo</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no tenés un plan asignado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registro rápido */}
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

      {/* Accesos directos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccesoDirecto
          href="/mi-diario"
          icono={NotebookPen}
          etiqueta="Mi diario"
        />
        <AccesoDirecto
          href="/mi-progreso"
          icono={TrendingUp}
          etiqueta="Mi progreso"
        />
        <AccesoDirecto
          href="/mensajes"
          icono={MessageSquare}
          etiqueta="Mensajes"
        />
        <AccesoDirecto
          href="/mi-plan"
          icono={ClipboardList}
          etiqueta="Mi plan"
        />
      </div>
    </div>
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Registro rápido de hoy</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        {/* Peso */}
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Scale className="h-4 w-4 text-primary" /> Peso
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

        {/* Agua */}
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <GlassWater className="h-4 w-4 text-primary" /> Agua
            <span className="ml-auto tabular-nums text-muted-foreground">
              {agua} ml
            </span>
          </p>
          {cargando ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={guardando}
                onClick={() => onGuardar({ aguaMl: agua + 250 })}
              >
                +1 vaso (250 ml)
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AccesoDirecto({
  href,
  icono: Icono,
  etiqueta,
}: {
  href: string;
  icono: typeof NotebookPen;
  etiqueta: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
    >
      <Icono className="h-6 w-6 text-primary" />
      {etiqueta}
    </Link>
  );
}

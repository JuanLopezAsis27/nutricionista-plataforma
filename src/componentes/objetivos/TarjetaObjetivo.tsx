"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  History,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Plus,
  Target,
  CalendarClock,
} from "lucide-react";
import type { ObjetivoSalidaDto } from "@/aplicacion/dtos/objetivo.dto";
import type { EstadoObjetivo, EstadoEstrategia } from "@/dominio/entidades/Objetivo";
import { useObjetivos } from "@/lib/hooks/useObjetivos";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  ETIQUETAS_PRIORIDAD,
  ETIQUETAS_ESTADO_OBJETIVO,
  ETIQUETAS_ESTADO_ESTRATEGIA,
  ETIQUETAS_EVENTO,
  COLOR_PRIORIDAD,
} from "./etiquetas";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { DialogoMotivo } from "./DialogoMotivo";
import { FormularioObjetivo } from "./FormularioObjetivo";

/** Acción pendiente que exige motivo (cambio de estado de objetivo/estrategia). */
type AccionConMotivo =
  | { tipo: "objetivo"; estado: EstadoObjetivo; titulo: string }
  | { tipo: "estrategia"; estrategiaId: string; estado: EstadoEstrategia; titulo: string };

/** Tarjeta de un objetivo: estado, estrategias con motivo, historial. */
export function TarjetaObjetivo({ objetivo }: { objetivo: ObjetivoSalidaDto }) {
  const {
    cambiarEstado,
    eliminar,
    agregarEstrategia,
    cambiarEstadoEstrategia,
    eliminarEstrategia,
    historial,
  } = useObjetivos();

  const [editar, setEditar] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [accion, setAccion] = useState<AccionConMotivo | null>(null);

  // Alta de estrategia (inline)
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevoMotivo, setNuevoMotivo] = useState("");

  const eventos = historial({ id: objetivo.id }, { enabled: verHistorial });
  const cerrado = objetivo.estado !== "EN_CURSO";

  function confirmarMotivo(motivo: string) {
    if (!accion) return;
    if (accion.tipo === "objetivo") {
      cambiarEstado.mutate(
        { id: objetivo.id, estado: accion.estado, motivo },
        { onSuccess: () => setAccion(null) },
      );
    } else {
      cambiarEstadoEstrategia.mutate(
        {
          objetivoId: objetivo.id,
          estrategiaId: accion.estrategiaId,
          estado: accion.estado,
          motivo,
        },
        { onSuccess: () => setAccion(null) },
      );
    }
  }

  function agregar() {
    agregarEstrategia.mutate(
      { objetivoId: objetivo.id, descripcion: nuevaDescripcion, motivo: nuevoMotivo },
      {
        onSuccess: () => {
          setNuevaDescripcion("");
          setNuevoMotivo("");
        },
      },
    );
  }

  return (
    <Card className={cn(cerrado && "opacity-80")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-start justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5 shrink-0 text-primary" />
            {objetivo.titulo}
          </span>
          <span className="flex flex-wrap gap-1.5">
            <Badge className={COLOR_PRIORIDAD[objetivo.prioridad]}>
              {ETIQUETAS_PRIORIDAD[objetivo.prioridad]}
            </Badge>
            <Badge variant={objetivo.estado === "EN_CURSO" ? "secondary" : "outline"}>
              {ETIQUETAS_ESTADO_OBJETIVO[objetivo.estado]}
            </Badge>
          </span>
        </CardTitle>
        {(objetivo.fechaObjetivo || objetivo.descripcion) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {objetivo.fechaObjetivo && (
              <p className="flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" /> Meta:{" "}
                {formatearFecha(objetivo.fechaObjetivo)}
              </p>
            )}
            {objetivo.descripcion && <p>{objetivo.descripcion}</p>}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* La meta medible que este plan persigue, si se vinculó una: el
            progreso sale de las antropometrías, no de una autoevaluación. */}
        <MetaVinculada
          pacienteId={objetivo.pacienteId}
          objetivoComposicionId={objetivo.objetivoComposicionId}
        />

        {/* Estrategias */}
        {objetivo.estrategias.length > 0 && (
          <ul className="space-y-2">
            {objetivo.estrategias.map((estrategia) => (
              <li key={estrategia.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "font-medium",
                        estrategia.estado === "DESCARTADA" && "line-through opacity-60",
                      )}
                    >
                      {estrategia.descripcion}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Motivo: {estrategia.motivo}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={estrategia.estado === "ACTIVA" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {ETIQUETAS_ESTADO_ESTRATEGIA[estrategia.estado]}
                    </Badge>
                    {estrategia.estado === "ACTIVA" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Marcar lograda"
                          onClick={() =>
                            setAccion({
                              tipo: "estrategia",
                              estrategiaId: estrategia.id,
                              estado: "LOGRADA",
                              titulo: `Marcar lograda: «${estrategia.descripcion}»`,
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Descartar"
                          onClick={() =>
                            setAccion({
                              tipo: "estrategia",
                              estrategiaId: estrategia.id,
                              estado: "DESCARTADA",
                              titulo: `Descartar: «${estrategia.descripcion}»`,
                            })
                          }
                        >
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reactivar"
                        onClick={() =>
                          setAccion({
                            tipo: "estrategia",
                            estrategiaId: estrategia.id,
                            estado: "ACTIVA",
                            titulo: `Reactivar: «${estrategia.descripcion}»`,
                          })
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar estrategia"
                      onClick={() =>
                        eliminarEstrategia.mutate({
                          objetivoId: objetivo.id,
                          estrategiaId: estrategia.id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Alta de estrategia */}
        {!cerrado && (
          <div className="grid gap-2 rounded-md border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="Nueva estrategia…"
              value={nuevaDescripcion}
              onChange={(e) => setNuevaDescripcion(e.target.value)}
            />
            <Input
              placeholder="¿Por qué esta estrategia?"
              value={nuevoMotivo}
              onChange={(e) => setNuevoMotivo(e.target.value)}
            />
            <Button
              onClick={agregar}
              disabled={
                agregarEstrategia.isPending ||
                !nuevaDescripcion.trim() ||
                !nuevoMotivo.trim()
              }
            >
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        )}

        {/* Acciones del objetivo */}
        <div className="flex flex-wrap justify-end gap-1.5 border-t pt-3">
          {objetivo.estado === "EN_CURSO" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setAccion({
                    tipo: "objetivo",
                    estado: "CUMPLIDO",
                    titulo: `Marcar cumplido: «${objetivo.titulo}»`,
                  })
                }
              >
                <CheckCircle2 className="h-4 w-4" />
                Cumplido
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setAccion({
                    tipo: "objetivo",
                    estado: "ABANDONADO",
                    titulo: `Abandonar: «${objetivo.titulo}»`,
                  })
                }
              >
                <XCircle className="h-4 w-4" />
                Abandonar
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setAccion({
                  tipo: "objetivo",
                  estado: "EN_CURSO",
                  titulo: `Reabrir: «${objetivo.titulo}»`,
                })
              }
            >
              <RotateCcw className="h-4 w-4" />
              Reabrir
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setVerHistorial(true)}>
            <History className="h-4 w-4" />
            Historial
          </Button>
          <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditar(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar"
            onClick={() => setConfirmarEliminar(true)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>

      {/* Diálogo de motivo (cambios de estado) */}
      <DialogoMotivo
        abierto={Boolean(accion)}
        titulo={accion?.titulo ?? ""}
        cargando={cambiarEstado.isPending || cambiarEstadoEstrategia.isPending}
        onCancelar={() => setAccion(null)}
        onConfirmar={confirmarMotivo}
      />

      {/* Edición */}
      <Dialog open={editar} onOpenChange={setEditar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar objetivo</DialogTitle>
          </DialogHeader>
          <FormularioObjetivo
            pacienteId={objetivo.pacienteId}
            objetivoInicial={objetivo}
            onTerminado={() => setEditar(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Historial */}
      <Dialog open={verHistorial} onOpenChange={setVerHistorial}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial — {objetivo.titulo}</DialogTitle>
          </DialogHeader>
          {eventos.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (eventos.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
          ) : (
            <ol className="relative space-y-4 border-l pl-4">
              {eventos.data!.map((evento) => (
                <li key={evento.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground">
                    {formatearFecha(evento.creadoEn)} · {ETIQUETAS_EVENTO[evento.tipo]}
                  </p>
                  <p className="text-sm">{evento.detalle}</p>
                  {evento.motivo && (
                    <p className="text-xs text-muted-foreground">Motivo: {evento.motivo}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <ModalConfirmacion
        abierto={confirmarEliminar}
        titulo="Eliminar objetivo"
        descripcion={`¿Eliminar «${objetivo.titulo}»? Se pierde también su historial. Si querés conservar la traza, marcalo como abandonado.`}
        cargando={eliminar.isPending}
        onCancelar={() => setConfirmarEliminar(false)}
        onConfirmar={() =>
          eliminar.mutate({ id: objetivo.id }, { onSuccess: () => setConfirmarEliminar(false) })
        }
      />
    </Card>
  );
}

/**
 * Progreso medido de la meta numérica asociada al plan.
 *
 * Es el punto del vínculo: el objetivo cualitativo dice qué se hace y por qué,
 * y esta franja dice si está funcionando, con el número que salió del
 * plicómetro. Sin vínculo no renderiza nada.
 */
function MetaVinculada({
  pacienteId,
  objetivoComposicionId,
}: {
  pacienteId: string;
  objetivoComposicionId: string | null;
}) {
  const { obtenerComposicion } = useEvaluacion();
  const composicion = obtenerComposicion(
    { pacienteId },
    { enabled: objetivoComposicionId != null },
  );

  if (objetivoComposicionId == null) return null;

  const meta = composicion.data?.objetivos.find(
    (o) => o.id === objetivoComposicionId,
  );
  if (!meta) return null;

  const p = meta.proyeccion;
  const unidad = p.unidad ? ` ${p.unidad}` : "";
  const falta = p.brecha != null ? Math.abs(p.brecha) : null;

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Target className="h-3.5 w-3.5" /> Meta medida: {meta.descripcion}
      </p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="tabular-nums">
          {formatearNumero(p.valorActual)}
          {unidad}
          <span className="mx-1 text-muted-foreground">→</span>
          <span className="font-semibold">
            {formatearNumero(p.valorObjetivo)}
            {unidad}
          </span>
        </span>
        {falta != null && falta > 0 && (
          <span className="text-xs text-muted-foreground">
            faltan{" "}
            <span className="font-medium tabular-nums">
              {formatearNumero(falta)}
              {unidad}
            </span>
          </span>
        )}
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${p.progresoPorcentaje ?? 0}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatearNumero(p.progresoPorcentaje)} % del camino, según las
        antropometrías.
      </p>
    </div>
  );
}

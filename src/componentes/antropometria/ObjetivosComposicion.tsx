"use client";

import { useState } from "react";
import {
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  CalendarX,
  HelpCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ObjetivoComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { EstadoProyeccion } from "@/dominio/servicios/proyeccionComposicion";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent } from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioObjetivoComposicion } from "./FormularioObjetivoComposicion";
import { useTemaComposicion } from "./useTemaComposicion";
import type { TemaComposicion } from "./paleta";

/**
 * Aspecto de cada estado de la proyección. El color NUNCA va solo: siempre
 * acompañado del ícono y de la frase, porque son colores de estado y en tema
 * claro dos de ellos quedan por debajo de 3:1 contra el fondo.
 */
const ESTADOS: Record<
  EstadoProyeccion,
  {
    etiqueta: string;
    icono: typeof CheckCircle2;
    color: (t: TemaComposicion) => string;
  }
> = {
  ALCANZADO: {
    etiqueta: "Objetivo alcanzado",
    icono: CheckCircle2,
    color: (t) => t.bien,
  },
  EN_CAMINO: {
    etiqueta: "En camino",
    icono: TrendingDown,
    color: (t) => t.bien,
  },
  ATRASADO: {
    etiqueta: "Va lento para la fecha",
    icono: AlertTriangle,
    color: (t) => t.atencion,
  },
  ALEJANDOSE: {
    etiqueta: "Se aleja del objetivo",
    icono: CircleAlert,
    color: (t) => t.alerta,
  },
  VENCIDO: {
    etiqueta: "Venció la fecha sin alcanzarlo",
    icono: CalendarX,
    color: (t) => t.alerta,
  },
  SIN_DATOS: {
    etiqueta: "Faltan mediciones para proyectar",
    icono: HelpCircle,
    color: (t) => t.tintaSuave,
  },
};

/** Objetivos cuantitativos de composición + su proyección. */
export function ObjetivosComposicion({
  pacienteId,
  objetivos,
}: {
  pacienteId: string;
  objetivos: ObjetivoComposicionDto[];
}) {
  const { eliminarObjetivoComposicion } = useEvaluacion();
  const { tema, montado } = useTemaComposicion();
  const [editando, setEditando] = useState<ObjetivoComposicionDto | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<ObjetivoComposicionDto | null>(
    null,
  );

  if (!montado) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Objetivos de composición</h3>
          <p className="text-sm text-muted-foreground">
            Metas numéricas sobre las variables que mide la antropometría.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo objetivo
        </Button>
      </div>

      {objetivos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay objetivos. Planteá uno y el dashboard va a mostrar la
          brecha, el ritmo del paciente y si llega a la fecha.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {objetivos.map((objetivo) => (
            <TarjetaObjetivo
              key={objetivo.id}
              objetivo={objetivo}
              tema={tema}
              onEditar={() => {
                setEditando(objetivo);
                setAbierto(true);
              }}
              onEliminar={() => setEliminando(objetivo)}
            />
          ))}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Objetivo de ${editando.descripcion}`
                : "Nuevo objetivo de composición"}
            </DialogTitle>
          </DialogHeader>
          <FormularioObjetivoComposicion
            pacienteId={pacienteId}
            objetivoInicial={editando}
            variablesOcupadas={objetivos.map((o) => o.variable)}
            onTerminado={() => setAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar objetivo"
        descripcion={`¿Eliminar el objetivo de ${eliminando?.descripcion}?`}
        cargando={eliminarObjetivoComposicion.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminarObjetivoComposicion.mutate(
              { id: eliminando.id },
              { onSuccess: () => setEliminando(null) },
            );
          }
        }}
        onCancelar={() => setEliminando(null)}
      />
    </div>
  );
}

function TarjetaObjetivo({
  objetivo,
  tema,
  onEditar,
  onEliminar,
}: {
  objetivo: ObjetivoComposicionDto;
  tema: TemaComposicion;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const p = objetivo.proyeccion;
  const estado = ESTADOS[p.estado];
  const Icono = estado.icono;
  const color = estado.color(tema);
  const unidad = p.unidad ? ` ${p.unidad}` : "";
  const hayQueBajar = p.brecha != null && p.brecha < 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Target className="h-4 w-4 text-muted-foreground" />
              {objetivo.descripcion}
            </p>
            <p className="text-xs text-muted-foreground">
              Meta: {formatearNumero(p.valorObjetivo)}
              {unidad}
              {p.fechaObjetivo &&
                ` · para el ${formatearFecha(p.fechaObjetivo)}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditar}
              aria-label="Editar objetivo"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEliminar}
              aria-label="Eliminar objetivo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Recorrido: de dónde salió, dónde está, a dónde va. */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">
              Inicio {formatearNumero(p.valorInicial)}
              {unidad}
            </span>
            <span className="text-base font-bold tabular-nums text-foreground">
              {formatearNumero(p.valorActual)}
              {unidad}
            </span>
            <span className="tabular-nums">
              Meta {formatearNumero(p.valorObjetivo)}
              {unidad}
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <span
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${p.progresoPorcentaje ?? 0}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <p className="text-xs" style={{ color: tema.tinta }}>
            <span className="font-semibold tabular-nums">
              {formatearNumero(p.progresoPorcentaje)} %
            </span>{" "}
            del camino recorrido
            {p.brecha != null && p.brecha !== 0 && (
              <>
                {" · faltan "}
                <span className="font-semibold tabular-nums">
                  {formatearNumero(Math.abs(p.brecha))}
                  {unidad}
                </span>{" "}
                {hayQueBajar ? "por bajar" : "por subir"}
              </>
            )}
          </p>
        </div>

        <div
          className="flex items-start gap-2 rounded-md p-2 text-xs"
          style={{ backgroundColor: `${color}14` }}
        >
          <Icono
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color }}
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold" style={{ color }}>
              {estado.etiqueta}
            </p>
            <Explicacion proyeccion={p} unidad={unidad} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** El "qué hacer" en una frase: ritmo actual contra el ritmo que hace falta. */
function Explicacion({
  proyeccion: p,
  unidad,
}: {
  proyeccion: ObjetivoComposicionDto["proyeccion"];
  unidad: string;
}) {
  if (p.estado === "ALCANZADO") {
    return (
      <p className="text-muted-foreground">
        Se puede plantear la siguiente meta.
      </p>
    );
  }
  if (p.ritmoSemanal == null) {
    return (
      <p className="text-muted-foreground">
        Con una segunda medición se puede estimar el ritmo y proyectar la fecha
        de llegada.
      </p>
    );
  }

  const Flecha = p.ritmoSemanal < 0 ? TrendingDown : TrendingUp;
  return (
    <div className="space-y-0.5 text-muted-foreground">
      <p className="flex items-center gap-1">
        <Flecha className="h-3 w-3 shrink-0" aria-hidden />
        Ritmo actual:{" "}
        <span className={cn("font-medium tabular-nums")}>
          {p.ritmoSemanal > 0 ? "+" : ""}
          {formatearNumero(p.ritmoSemanal)}
          {unidad}/semana
        </span>
      </p>
      {p.ritmoSemanalNecesario != null && (
        <p>
          Para llegar en fecha hace falta{" "}
          <span className="font-medium tabular-nums">
            {p.ritmoSemanalNecesario > 0 ? "+" : ""}
            {formatearNumero(p.ritmoSemanalNecesario)}
            {unidad}/semana
          </span>
          .
        </p>
      )}
      {p.fechaProyectada && (
        <p>
          A este ritmo llega el{" "}
          <span className="font-medium">
            {formatearFecha(p.fechaProyectada)}
          </span>
          .
        </p>
      )}
      {p.valorProyectadoAFecha != null && p.fechaObjetivo && (
        <p>
          Proyección a la fecha meta:{" "}
          <span className="font-medium tabular-nums">
            {formatearNumero(p.valorProyectadoAFecha)}
            {unidad}
          </span>
          .
        </p>
      )}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import {
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
import type {
  EstadoProyeccion,
  ProyeccionMeta,
} from "@/dominio/servicios/proyeccionComposicion";
import { formatearFecha, formatearMedida } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent } from "@/componentes/ui/card";
import type { TemaComposicion } from "./paleta";

/**
 * La tarjeta de UNA meta numérica: de dónde salió, dónde está, a dónde va y
 * si con el ritmo actual llega.
 *
 * Es compartida por los objetivos de la antropometría y los de la
 * bioimpedancia porque la proyección que dibuja es la misma
 * (`proyectarMeta`): con dos copias, una corrección de la lectura del ritmo
 * quedaría aplicada en una sola pestaña. Lo propio de cada una —los pliegues
 * proyectados de la antropometría— entra por `children`.
 */

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

export function TarjetaMeta({
  descripcion,
  proyeccion: p,
  tema,
  onEditar,
  onEliminar,
  children,
}: {
  descripcion: string;
  proyeccion: ProyeccionMeta;
  tema: TemaComposicion;
  onEditar: () => void;
  onEliminar: () => void;
  /** Detalle propio de la meta, entre el recorrido y el estado. */
  children?: ReactNode;
}) {
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
              {descripcion}
            </p>
            <p className="text-xs text-muted-foreground">
              Meta: {formatearMedida(p.valorObjetivo)}
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
              Inicio {formatearMedida(p.valorInicial)}
              {unidad}
            </span>
            <span className="text-base font-bold tabular-nums text-foreground">
              {formatearMedida(p.valorActual)}
              {unidad}
            </span>
            <span className="tabular-nums">
              Meta {formatearMedida(p.valorObjetivo)}
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
              {formatearMedida(p.progresoPorcentaje)} %
            </span>{" "}
            del camino recorrido
            {p.brecha != null && p.brecha !== 0 && (
              <>
                {" · faltan "}
                <span className="font-semibold tabular-nums">
                  {formatearMedida(Math.abs(p.brecha))}
                  {unidad}
                </span>{" "}
                {hayQueBajar ? "por bajar" : "por subir"}
              </>
            )}
          </p>
        </div>

        {children}

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
  proyeccion: ProyeccionMeta;
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
          {formatearMedida(p.ritmoSemanal)}
          {unidad}/semana
        </span>
      </p>
      {p.ritmoSemanalNecesario != null && (
        <p>
          Para llegar en fecha hace falta{" "}
          <span className="font-medium tabular-nums">
            {p.ritmoSemanalNecesario > 0 ? "+" : ""}
            {formatearMedida(p.ritmoSemanalNecesario)}
            {unidad}/semana
          </span>
          .
        </p>
      )}
      {p.ritmoPrevioALaMeta && (
        <p className="italic">
          Estimado con las mediciones previas: todavía no hay ninguna posterior
          a la meta. Se recalcula en la próxima consulta.
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
            {formatearMedida(p.valorProyectadoAFecha)}
            {unidad}
          </span>
          .
        </p>
      )}
    </div>
  );
}

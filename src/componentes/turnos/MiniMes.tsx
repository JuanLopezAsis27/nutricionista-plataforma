"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

/** Iniciales de los días, empezando en lunes (igual que el resto de la app). */
const INICIALES = ["L", "M", "X", "J", "V", "S", "D"];

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

interface PropsMiniMes {
  /** Primer día del mes que se está mirando, en UTC. */
  referencia: Date;
  onCambiarMes: (delta: number) => void;
  /** Día desde el que arranca la ventana de 7 días del detalle. */
  anclaISO: string;
  /** Los días que el detalle está mostrando, para pintarlos como rango. */
  diasVisibles: ReadonlySet<string>;
  /** Cuántos turnos tiene cada día, para el punto debajo del número. */
  turnosPorDia: ReadonlyMap<string, number>;
  hoyISO: string;
  onSeleccionar: (fechaISO: string) => void;
}

/**
 * Mes completo en chico, al costado del detalle de la semana.
 *
 * Es el mapa: muestra en qué días hay turnos y mueve la ventana de 7 días al
 * que se clickee. No abre nada por sí solo —el detalle de un turno se abre
 * desde la grilla, donde el turno tiene hora y duración—, así que un día del
 * mini mes es siempre "llevame ahí", nunca "mostrame esto".
 *
 * La semana arranca en lunes, no en domingo como el mini mes de Google: es la
 * convención que ya usaba el calendario de la app y la que lee el profesional
 * cuando piensa su semana de atención.
 */
export function MiniMes({
  referencia,
  onCambiarMes,
  anclaISO,
  diasVisibles,
  turnosPorDia,
  hoyISO,
  onSeleccionar,
}: PropsMiniMes) {
  const anio = referencia.getUTCFullYear();
  const mes = referencia.getUTCMonth();

  // Offset con lunes = 0: getUTCDay() devuelve 0 para domingo.
  const offset = (new Date(Date.UTC(anio, mes, 1)).getUTCDay() + 6) % 7;
  const diasEnMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        <p className="text-sm font-semibold capitalize">
          {MESES[mes]} {anio}
        </p>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Mes anterior"
            onClick={() => onCambiarMes(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Mes siguiente"
            onClick={() => onCambiarMes(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {INICIALES.map((inicial, i) => (
          <div
            key={i}
            aria-hidden
            className="pb-1 text-center text-[11px] font-medium text-muted-foreground"
          >
            {inicial}
          </div>
        ))}

        {celdas.map((dia, i) => {
          if (dia == null) return <div key={`v${i}`} />;

          const fechaISO = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const cantidad = turnosPorDia.get(fechaISO) ?? 0;
          const esAncla = fechaISO === anclaISO;
          const enRango = diasVisibles.has(fechaISO);
          const esHoy = fechaISO === hoyISO;

          return (
            <button
              key={fechaISO}
              type="button"
              onClick={() => onSeleccionar(fechaISO)}
              aria-current={esAncla ? "date" : undefined}
              title={
                cantidad > 0
                  ? `${cantidad} ${cantidad === 1 ? "turno" : "turnos"}`
                  : "Sin turnos"
              }
              className={cn(
                "relative mx-auto flex h-7 w-7 flex-col items-center justify-center rounded-full text-xs tabular-nums transition-colors",
                enRango && !esAncla && "bg-accent",
                esAncla && "bg-primary font-semibold text-primary-foreground",
                !esAncla && esHoy && "font-bold text-primary",
                !esAncla && "hover:bg-secondary",
              )}
            >
              {dia}
              {/* El punto dice "acá hay algo" sin depender del color: el número
                  del día ya usa el color para señalar hoy y la selección. */}
              {cantidad > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-0.5 h-1 w-1 rounded-full",
                    esAncla ? "bg-primary-foreground" : "bg-primary",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

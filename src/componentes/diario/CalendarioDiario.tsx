"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiaCalendarioDto } from "@/aplicacion/dtos/diario.dto";
import { aFechaISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

interface PropsCalendario {
  anio: number;
  mes: number; // 1-12
  dias: DiaCalendarioDto[];
  seleccionada: string; // YYYY-MM-DD
  hoy: string; // YYYY-MM-DD (hoy local del paciente)
  onSeleccionar: (fechaISO: string) => void;
  onCambiarMes: (anio: number, mes: number) => void;
}

/**
 * Calendario mensual del diario: cada día con registros muestra puntos
 * indicadores (peso/agua/comidas/actividad; el detalle vive en la hoja
 * del día, los puntos solo marcan "hay datos").
 */
export function CalendarioDiario({
  anio,
  mes,
  dias,
  seleccionada,
  hoy,
  onSeleccionar,
  onCambiarMes,
}: PropsCalendario) {
  const porFecha = new Map(dias.map((dia) => [aFechaISO(dia.fecha), dia]));

  const primerDia = new Date(Date.UTC(anio, mes - 1, 1));
  const diasEnMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  // getUTCDay(): 0=domingo; la grilla arranca en lunes.
  const desplazamiento = (primerDia.getUTCDay() + 6) % 7;

  function mesAnterior() {
    const fecha = new Date(Date.UTC(anio, mes - 2, 1));
    onCambiarMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1);
  }
  function mesSiguiente() {
    const fecha = new Date(Date.UTC(anio, mes, 1));
    onCambiarMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1);
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold capitalize">
          {MESES[mes - 1]} {anio}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={mesAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={mesSiguiente}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {DIAS_SEMANA.map((dia) => (
          <span key={dia} className="py-1">
            {dia}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: desplazamiento }).map((_, indice) => (
          <span key={`v-${indice}`} />
        ))}
        {Array.from({ length: diasEnMes }).map((_, indice) => {
          const numero = indice + 1;
          const fechaISO = `${anio}-${String(mes).padStart(2, "0")}-${String(numero).padStart(2, "0")}`;
          const datos = porFecha.get(fechaISO);
          const esFutura = fechaISO > hoy;

          return (
            <button
              key={fechaISO}
              type="button"
              disabled={esFutura}
              onClick={() => onSeleccionar(fechaISO)}
              aria-label={`Ver el día ${numero}`}
              className={cn(
                "flex h-14 flex-col items-center justify-center rounded-md border text-sm transition-colors",
                fechaISO === seleccionada
                  ? "border-primary bg-accent font-semibold text-accent-foreground"
                  : "hover:bg-muted",
                fechaISO === hoy && fechaISO !== seleccionada && "border-primary/50",
                esFutura && "cursor-not-allowed opacity-40",
              )}
            >
              <span>{numero}</span>
              {datos && (
                <span
                  className="mt-1 flex gap-0.5"
                  title={[
                    datos.tienePeso ? "peso" : null,
                    datos.tieneAgua ? "agua" : null,
                    datos.cantidadComidas > 0 ? `${datos.cantidadComidas} comida(s)` : null,
                    datos.cantidadActividades > 0 ? "actividad" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                >
                  {datos.tienePeso && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  {datos.tieneAgua && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                  )}
                  {datos.cantidadComidas > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400" />
                  )}
                  {datos.cantidadActividades > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Peso
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" /> Agua
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400" /> Comidas
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400" /> Actividad
        </span>
      </p>
    </div>
  );
}

"use client";

import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  GlassWater,
  Scale,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { DiaCalendarioDto } from "@/aplicacion/dtos/diario.dto";
import { aFechaISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
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

/**
 * Los cuatro indicadores del día, con su color y su ícono.
 *
 * El color ubica de un vistazo qué falta en el mes; el ícono es lo que
 * realmente lo dice, y la leyenda de abajo los nombra a los cuatro. Un punto
 * de color a secas obligaba a memorizar cuál era cuál —y no lo distingue
 * cualquiera—.
 */
const INDICADORES: {
  clave: keyof RegistroDelDia;
  etiqueta: string;
  icono: LucideIcon;
  color: string;
}[] = [
  {
    clave: "peso",
    etiqueta: "Peso",
    icono: Scale,
    color: "text-rose-600 dark:text-rose-400",
  },
  {
    clave: "agua",
    etiqueta: "Agua",
    icono: GlassWater,
    color: "text-sky-600 dark:text-sky-400",
  },
  {
    clave: "comidas",
    etiqueta: "Comidas",
    icono: UtensilsCrossed,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    clave: "actividad",
    etiqueta: "Actividad",
    icono: Dumbbell,
    color: "text-violet-600 dark:text-violet-400",
  },
];

interface RegistroDelDia {
  peso: boolean;
  agua: boolean;
  comidas: boolean;
  actividad: boolean;
}

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
 * Calendario mensual del diario: cada día con registros muestra los íconos de
 * lo que cargó (peso / agua / comidas / actividad; el detalle vive en la hoja
 * del día, acá solo se marca «hay datos»), y arriba, cuántos días del mes
 * llevan registro.
 *
 * Ese contador es lo que convierte la grilla en una respuesta: la pregunta que
 * se le hace a un calendario de hábitos es «¿cómo vengo este mes?», y contar
 * cuadraditos a ojo no la contesta.
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

  const prefijoMes = `${anio}-${String(mes).padStart(2, "0")}`;
  // Días transcurridos del mes: en el mes en curso, hasta hoy; en uno pasado,
  // el mes entero; en uno futuro, ninguno. Contra el total del mes, un mes
  // recién empezado se vería siempre en rojo.
  const diasTranscurridos =
    hoy.slice(0, 7) === prefijoMes
      ? Number(hoy.slice(8, 10))
      : prefijoMes < hoy.slice(0, 7)
        ? diasEnMes
        : 0;
  const diasConRegistro = dias.filter((dia) =>
    tieneAlgo(registroDe(dia)),
  ).length;
  const porcentaje =
    diasTranscurridos > 0
      ? Math.round((diasConRegistro / diasTranscurridos) * 100)
      : 0;

  function mesAnterior() {
    const fecha = new Date(Date.UTC(anio, mes - 2, 1));
    onCambiarMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1);
  }
  function mesSiguiente() {
    const fecha = new Date(Date.UTC(anio, mes, 1));
    onCambiarMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
        <h3 className="text-base font-semibold capitalize">
          {MESES[mes - 1]} {anio}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes anterior"
            onClick={mesAnterior}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes siguiente"
            onClick={mesSiguiente}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {diasTranscurridos > 0 && (
        <div className="space-y-1.5 border-b px-4 py-3">
          <p className="flex items-baseline justify-between text-sm">
            <span className="font-medium">
              {diasConRegistro} de {diasTranscurridos} días con registro
            </span>
            <span className="tabular-nums text-muted-foreground">
              {porcentaje} %
            </span>
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, porcentaje)}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-muted-foreground">
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
            const fechaISO = `${prefijoMes}-${String(numero).padStart(2, "0")}`;
            const datos = porFecha.get(fechaISO);
            const registro = datos ? registroDe(datos) : null;
            const conDatos = registro != null && tieneAlgo(registro);
            const esFutura = fechaISO > hoy;
            const esSeleccionada = fechaISO === seleccionada;
            const esHoy = fechaISO === hoy;

            return (
              <button
                key={fechaISO}
                type="button"
                disabled={esFutura}
                onClick={() => onSeleccionar(fechaISO)}
                aria-label={`Ver el día ${numero}${conDatos ? " (con registros)" : ""}`}
                aria-current={esSeleccionada ? "date" : undefined}
                title={registro ? resumenDe(registro, datos!) : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-all",
                  esSeleccionada
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : conDatos
                      ? "border-primary/20 bg-primary/5 hover:border-primary/50"
                      : "hover:bg-muted",
                  esHoy && !esSeleccionada && "ring-1 ring-primary",
                  esFutura && "cursor-not-allowed opacity-40",
                )}
              >
                <span className={cn(esHoy && "font-bold")}>{numero}</span>
                <span className="flex h-3 items-center gap-0.5">
                  {registro &&
                    INDICADORES.filter((i) => registro[i.clave]).map(
                      ({ clave, icono: Icono, color }) => (
                        <Icono
                          key={clave}
                          className={cn(
                            "h-3 w-3",
                            esSeleccionada ? "text-primary-foreground" : color,
                          )}
                        />
                      ),
                    )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {INDICADORES.map(({ clave, etiqueta, icono: Icono, color }) => (
            <span key={clave} className="inline-flex items-center gap-1">
              <Icono className={cn("h-3 w-3", color)} /> {etiqueta}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Qué cargó ese día, en la forma en que la grilla lo pinta. */
function registroDe(dia: DiaCalendarioDto): RegistroDelDia {
  return {
    peso: dia.tienePeso,
    agua: dia.tieneAgua,
    comidas: dia.cantidadComidas > 0,
    actividad: dia.cantidadActividades > 0,
  };
}

function tieneAlgo(registro: RegistroDelDia): boolean {
  return (
    registro.peso || registro.agua || registro.comidas || registro.actividad
  );
}

function resumenDe(registro: RegistroDelDia, dia: DiaCalendarioDto): string {
  return (
    [
      registro.peso ? "peso" : null,
      registro.agua ? "agua" : null,
      dia.cantidadComidas > 0
        ? `${dia.cantidadComidas} comida${dia.cantidadComidas === 1 ? "" : "s"}`
        : null,
      dia.cantidadActividades > 0 ? "actividad" : null,
    ]
      .filter(Boolean)
      .join(" · ") || "sin registros"
  );
}

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { aFechaISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  CONFIRMADO: "bg-blue-100 text-blue-800",
  COMPLETADO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

interface PropsCalendario {
  turnos: TurnoSalidaDto[];
  mapaPacientes: Map<string, string>;
  /** Se invoca al hacer click en un día (recibe la fecha en formato ISO). */
  onSeleccionarDia?: (fechaISO: string) => void;
}

/** Calendario mensual con los turnos como eventos. */
export function CalendarioTurnos({ turnos, mapaPacientes, onSeleccionarDia }: PropsCalendario) {
  const [referencia, setReferencia] = useState(() => {
    const ahora = new Date();
    return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
  });

  const anio = referencia.getUTCFullYear();
  const mes = referencia.getUTCMonth();

  // Agrupa los turnos por fecha ISO (YYYY-MM-DD).
  const porFecha = new Map<string, TurnoSalidaDto[]>();
  for (const turno of turnos) {
    const clave = aFechaISO(turno.fecha);
    const lista = porFecha.get(clave) ?? [];
    lista.push(turno);
    porFecha.set(clave, lista);
  }

  // Construye las celdas del mes (offset lunes = 0).
  const primerDia = new Date(Date.UTC(anio, mes, 1));
  const offset = (primerDia.getUTCDay() + 6) % 7;
  const diasEnMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  function cambiarMes(delta: number) {
    setReferencia(new Date(Date.UTC(anio, mes + delta, 1)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">
          {MESES[mes]} {anio}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => cambiarMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => cambiarMes(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
        {DIAS.map((dia) => (
          <div key={dia} className="bg-muted p-2 text-center text-xs font-medium">
            {dia}
          </div>
        ))}
        {celdas.map((dia, i) => {
          const claveFecha = dia ? aFechaISO(new Date(Date.UTC(anio, mes, dia))) : "";
          const turnosDia = dia ? (porFecha.get(claveFecha) ?? []) : [];
          const clickeable = Boolean(dia && onSeleccionarDia);
          return (
            <div
              key={i}
              role={clickeable ? "button" : undefined}
              tabIndex={clickeable ? 0 : undefined}
              onClick={clickeable ? () => onSeleccionarDia!(claveFecha) : undefined}
              className={cn(
                "min-h-24 bg-background p-1",
                !dia && "bg-muted/30",
                clickeable && "cursor-pointer transition-colors hover:bg-secondary/60",
              )}
            >
              {dia && <div className="mb-1 text-xs font-medium text-muted-foreground">{dia}</div>}
              <div className="space-y-1">
                {turnosDia
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map((turno) => (
                    <div
                      key={turno.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[11px]",
                        COLOR_ESTADO[turno.estado],
                      )}
                      title={`${turno.hora} · ${mapaPacientes.get(turno.pacienteId) ?? ""}`}
                    >
                      {turno.hora} {mapaPacientes.get(turno.pacienteId) ?? "Paciente"}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

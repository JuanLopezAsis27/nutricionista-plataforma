"use client";

import { Watch, Footprints, Moon, Activity } from "lucide-react";
import type { MetricaSalidaDto } from "@/aplicacion/dtos/metricas.dto";
import { useMetricas } from "@/lib/hooks/useMetricas";
import { formatearFecha } from "@/lib/formato";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

interface Props {
  /** Presente = vista del nutricionista (solo lectura). Ausente = paciente. */
  pacienteId?: string;
  /** El paciente puede elegir qué días cuentan (opt-in). */
  editable: boolean;
  desde: Date;
  hasta: Date;
}

/** Día consolidado (varias fuentes de un mismo día se combinan). */
interface DiaMetrica {
  fecha: Date;
  pasos: number | null;
  horasSueno: number | null;
  minutosActividad: number | null;
  incluir: boolean;
}

/**
 * Tarjeta de datos del reloj (wearable). Muestra los últimos días importados
 * (pasos, sueño, actividad) y, para el paciente, un toggle por día para elegir
 * si cuentan en su seguimiento (opt-in). Los datos los importa la app nativa
 * (Capacitor + HealthKit/Health Connect); ver docs/WEARABLES.md.
 */
export function MetricasDispositivo({
  pacienteId,
  editable,
  desde,
  hasta,
}: Props) {
  const { mias, dePaciente, fijarInclusion } = useMetricas();

  const esNutri = pacienteId != null;
  const consultaNutri = dePaciente(
    { pacienteId: pacienteId ?? "", desde, hasta },
    { enabled: esNutri },
  );
  const consultaMia = mias({ desde, hasta }, { enabled: !esNutri });
  const consulta = esNutri ? consultaNutri : consultaMia;

  if (consulta.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  const dias = consolidarPorDia(consulta.data ?? []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Watch className="h-5 w-5 text-primary" /> Datos del reloj
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dias.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {editable
              ? "Todavía no hay datos de un reloj o app de salud. Se sincronizan desde la app del teléfono."
              : "El paciente todavía no sincronizó datos de un reloj."}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {dias.map((dia) => (
              <li
                key={dia.fecha.toISOString()}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <span className="w-24 shrink-0 font-medium">
                  {formatearFecha(dia.fecha)}
                </span>
                <span className="flex flex-1 flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                  {dia.pasos != null && (
                    <span className="flex items-center gap-1">
                      <Footprints className="h-3.5 w-3.5" />{" "}
                      {dia.pasos.toLocaleString("es-AR")}
                    </span>
                  )}
                  {dia.horasSueno != null && (
                    <span className="flex items-center gap-1">
                      <Moon className="h-3.5 w-3.5" /> {dia.horasSueno} h
                    </span>
                  )}
                  {dia.minutosActividad != null && (
                    <span className="flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />{" "}
                      {dia.minutosActividad} min
                    </span>
                  )}
                </span>
                {editable ? (
                  <Button
                    size="sm"
                    variant={dia.incluir ? "default" : "outline"}
                    disabled={fijarInclusion.isPending}
                    onClick={() =>
                      fijarInclusion.mutate({
                        fecha: dia.fecha,
                        incluir: !dia.incluir,
                      })
                    }
                  >
                    {dia.incluir ? "Cuenta" : "No cuenta"}
                  </Button>
                ) : (
                  <span
                    className={
                      dia.incluir
                        ? "text-xs text-primary"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {dia.incluir ? "En seguimiento" : "Excluido"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Combina las filas por día (varias fuentes) y ordena de más reciente a más viejo. */
function consolidarPorDia(metricas: MetricaSalidaDto[]): DiaMetrica[] {
  const porFecha = new Map<string, DiaMetrica>();
  for (const m of metricas) {
    const clave = new Date(m.fecha).toISOString().slice(0, 10);
    const previa = porFecha.get(clave);
    porFecha.set(clave, {
      fecha: new Date(m.fecha),
      pasos: previa?.pasos ?? m.pasos,
      horasSueno: previa?.horasSueno ?? m.horasSueno,
      minutosActividad: previa?.minutosActividad ?? m.minutosActividad,
      // Si alguna fuente del día está incluida, el día cuenta.
      incluir: (previa?.incluir ?? false) || m.incluir,
    });
  }
  return [...porFecha.values()]
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, 14);
}

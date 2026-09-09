"use client";

import { Watch, Footprints, Moon, Activity, Hammer } from "lucide-react";
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
 *
 * **Va marcada como EN DESARROLLO, y eso no es un detalle de copy.** El backend
 * está entero —entidad, importación, opt-in, integración con el tracking— pero
 * el plugin de salud que llena los datos todavía no está montado en la app
 * nativa, así que en la práctica nadie tiene nada acá. Sin el aviso, la tarjeta
 * vacía se lee como «tu reloj no sincronizó» —un problema del paciente, que va
 * a ir a buscar el permiso que le falta— en vez de «esto todavía no existe».
 *
 * El aviso se saca cuando el plugin esté andando, no antes: mientras la lista
 * pueda estar vacía por una función que falta, decirlo es la única lectura
 * correcta de esa tarjeta.
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

  const dias = consolidarPorDia(consulta.data ?? []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b bg-amber-500/5 p-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Watch className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </span>
          Datos del reloj
        </CardTitle>
        {/* El estado va escrito, no solo en el color del rótulo. */}
        <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Hammer className="h-3 w-3" />
          En desarrollo
        </span>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          {editable
            ? "Todavía estamos trabajando en la sincronización con el reloj. Cuando esté lista vas a ver acá tus pasos, tu sueño y tus minutos de actividad, y vas a poder elegir qué días cuentan para tu seguimiento."
            : "La sincronización con el reloj del paciente todavía está en desarrollo: hasta que esté, esta sección puede no traer nada."}
        </p>
        {consulta.isLoading && <Skeleton className="h-16 w-full" />}
        {dias.length > 0 && (
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

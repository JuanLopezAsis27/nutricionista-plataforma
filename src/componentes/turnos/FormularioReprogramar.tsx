"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarOff } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import { aFechaISO, hoyArgentinaISO, horaArgentinaHHmm } from "@/lib/formato";
import {
  franjasDelDia,
  esDiaDeAtencion,
  diasDeAtencionEnTexto,
  ETIQUETA_MOTIVO,
} from "@/lib/agenda";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";

const esquema = z.object({
  fecha: z.string().min(1, "Elegí una fecha"),
  hora: z.string().min(1, "Elegí una hora"),
  duracion: z.string().min(1),
});
type DatosFormulario = z.infer<typeof esquema>;

interface PropsFormularioReprogramar {
  turno: TurnoSalidaDto;
  onTerminado: () => void;
}

/**
 * Formulario para reprogramar (cambiar día/hora/duración de) un turno.
 *
 * Usa la misma agenda que el alta —días de atención, horario y franjas
 * ocupadas— porque el dominio aplica la misma regla en los dos caminos: hasta
 * que la compartieron, reprogramar era la puerta de atrás para dejar un turno
 * un domingo. La grilla ignora el turno propio: moverlo 15 minutos no puede
 * chocar consigo mismo.
 */
export function FormularioReprogramar(props: PropsFormularioReprogramar) {
  const { obtener } = useConfiguracion();
  const consulta = obtener();
  if (consulta.isLoading || !consulta.data) {
    return <Skeleton className="h-64 w-full" />;
  }
  return <FormularioReprogramarInterno {...props} config={consulta.data} />;
}

function FormularioReprogramarInterno({
  turno,
  onTerminado,
  config,
}: PropsFormularioReprogramar & { config: ConfiguracionSalidaDto }) {
  const { reprogramar, listar } = useTurnos();
  const hoy = hoyArgentinaISO();

  const duraciones = useMemo(() => {
    const base = new Set([
      30,
      45,
      60,
      90,
      config.turnoDuracionMinutos,
      turno.duracionMinutos,
    ]);
    return [...base].sort((a, b) => a - b).map(String);
  }, [config.turnoDuracionMinutos, turno.duracionMinutos]);

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      fecha: aFechaISO(turno.fecha),
      hora: turno.hora,
      duracion: String(turno.duracionMinutos),
    },
  });

  const fechaActual = form.watch("fecha");
  const horaActual = form.watch("hora");
  const duracionActual = Number(form.watch("duracion"));

  const diaHabil = esDiaDeAtencion(config, fechaActual);

  const turnosDelDia = listar(
    { fecha: fechaActual ? new Date(fechaActual) : undefined },
    { enabled: Boolean(fechaActual) && diaHabil },
  );

  const franjas = useMemo(
    () =>
      franjasDelDia({
        config,
        fechaISO: fechaActual,
        duracionMinutos: duracionActual || turno.duracionMinutos,
        ocupados: turnosDelDia.data ?? [],
        hoyISO: hoy,
        ahoraHHmm: horaArgentinaHHmm(),
        excluirTurnoId: turno.id,
      }),
    [
      config,
      fechaActual,
      duracionActual,
      turnosDelDia.data,
      hoy,
      turno.id,
      turno.duracionMinutos,
    ],
  );

  const cargandoFranjas = diaHabil && turnosDelDia.isLoading;
  const primeraLibre = franjas.find((f) => f.disponible)?.hora ?? "";
  const sinHorarios = !cargandoFranjas && primeraLibre === "";

  // La hora original puede no caer en la grilla (turno viejo, otro paso de
  // agenda): se la agrega para no perderla, pero solo mientras siga libre.
  const franjasVisibles = useMemo(() => {
    if (cargandoFranjas) return franjas;
    if (franjas.some((f) => f.hora === turno.hora)) return franjas;
    return [{ hora: turno.hora, disponible: true, motivo: null }, ...franjas];
  }, [franjas, turno.hora, cargandoFranjas]);

  useEffect(() => {
    if (cargandoFranjas) return;
    const elegida = franjasVisibles.find((f) => f.hora === horaActual);
    if (!elegida?.disponible) {
      form.setValue("hora", primeraLibre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [franjasVisibles, cargandoFranjas]);

  function alEnviar(datos: DatosFormulario) {
    reprogramar.mutate(
      {
        id: turno.id,
        fecha: new Date(datos.fecha),
        hora: datos.hora,
        duracionMinutos: Number(datos.duracion),
      },
      { onSuccess: onTerminado },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" min={hoy} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hora"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!diaHabil || cargandoFranjas}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          cargandoFranjas ? "Cargando…" : "Sin horarios"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {franjasVisibles.map((franja) => (
                      <SelectItem
                        key={franja.hora}
                        value={franja.hora}
                        disabled={!franja.disponible}
                      >
                        {franja.hora}
                        {franja.motivo && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({ETIQUETA_MOTIVO[franja.motivo]})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!diaHabil && (
          <p className="flex items-start gap-2 rounded-md border border-yellow-300/60 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
            <CalendarOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Ese día el consultorio no atiende. Días de atención:{" "}
              {diasDeAtencionEnTexto(config)}. Se cambian en Configuración.
            </span>
          </p>
        )}

        {diaHabil && sinHorarios && (
          <p className="text-sm text-muted-foreground">
            No queda ninguna franja libre ese día: están todas ocupadas o fuera
            del horario de atención.
          </p>
        )}

        <FormField
          control={form.control}
          name="duracion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duración</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {duraciones.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={reprogramar.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={reprogramar.isPending || !diaHabil || sinHorarios}
          >
            {reprogramar.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

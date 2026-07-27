"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import { hoyArgentinaISO, horaArgentinaHHmm } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
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
import { SelectorPaciente } from "@/componentes/pacientes/SelectorPaciente";

const esquema = z.object({
  pacienteId: z.string().min(1, "Elegí un paciente"),
  fecha: z.string().min(1, "Elegí una fecha"),
  hora: z.string().min(1, "Elegí una hora"),
  duracion: z.string().min(1),
  notas: z.string().optional(),
});
type DatosFormulario = z.infer<typeof esquema>;

interface PropsFormularioTurno {
  onTerminado: () => void;
  pacienteIdInicial?: string;
  /** Fecha (YYYY-MM-DD) con la que abrir el formulario (ej. la casilla del calendario). */
  fechaInicial?: string;
}

function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Formulario para agendar un turno. Los horarios (paso/rango) y la duración por
 * defecto salen de la Configuración del consultorio; se espera a que cargue para
 * inicializar los valores correctos.
 */
export function FormularioTurno(props: PropsFormularioTurno) {
  const { obtener } = useConfiguracion();
  const consulta = obtener();
  if (consulta.isLoading || !consulta.data) {
    return <Skeleton className="h-96 w-full" />;
  }
  return <FormularioTurnoInterno {...props} config={consulta.data} />;
}

function FormularioTurnoInterno({
  onTerminado,
  pacienteIdInicial,
  fechaInicial,
  config,
}: PropsFormularioTurno & { config: ConfiguracionSalidaDto }) {
  const { agendar } = useTurnos();

  const hoy = hoyArgentinaISO();
  const fechaResuelta = fechaInicial && fechaInicial >= hoy ? fechaInicial : hoy;

  const horarios = useMemo(() => {
    const paso = config.turnoPasoMinutos;
    const desde = aMinutos(config.atencionHoraDesde ?? "08:00");
    const hasta = aMinutos(config.atencionHoraHasta ?? "20:00");
    const slots: string[] = [];
    for (let minutos = desde; minutos <= hasta; minutos += paso) {
      const h = String(Math.floor(minutos / 60)).padStart(2, "0");
      const m = String(minutos % 60).padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
    return slots;
  }, [config.turnoPasoMinutos, config.atencionHoraDesde, config.atencionHoraHasta]);

  const duraciones = useMemo(() => {
    const base = new Set([30, 45, 60, 90, config.turnoDuracionMinutos]);
    return [...base].sort((a, b) => a - b).map(String);
  }, [config.turnoDuracionMinutos]);

  /** Un horario no está disponible si ya pasó (solo aplica cuando la fecha es hoy). */
  const horarioNoDisponible = (fecha: string, hora: string): boolean =>
    fecha === hoy && hora <= horaArgentinaHHmm();

  const primerDisponible = (fecha: string): string =>
    horarios.find((h) => !horarioNoDisponible(fecha, h)) ?? horarios[0] ?? "09:00";

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      pacienteId: pacienteIdInicial ?? "",
      fecha: fechaResuelta,
      hora: primerDisponible(fechaResuelta),
      duracion: String(config.turnoDuracionMinutos),
      notas: "",
    },
  });

  // Si cambia la fecha y la hora elegida ya no está disponible, la reubica.
  const fechaActual = form.watch("fecha");
  const horaActual = form.watch("hora");
  useEffect(() => {
    if (fechaActual && horarioNoDisponible(fechaActual, horaActual)) {
      form.setValue("hora", primerDisponible(fechaActual));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaActual]);

  function alEnviar(datos: DatosFormulario) {
    agendar.mutate(
      {
        pacienteId: datos.pacienteId,
        fecha: new Date(datos.fecha),
        hora: datos.hora,
        duracionMinutos: Number(datos.duracion),
        notas: datos.notas?.trim() ? datos.notas : null,
      },
      { onSuccess: onTerminado },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <FormField
          control={form.control}
          name="pacienteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paciente</FormLabel>
              <FormControl>
                <SelectorPaciente valor={field.value || null} onCambiar={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {horarios.map((hora) => (
                      <SelectItem
                        key={hora}
                        value={hora}
                        disabled={horarioNoDisponible(fechaActual, hora)}
                      >
                        {hora}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onTerminado} disabled={agendar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={agendar.isPending}>
            {agendar.isPending ? "Agendando…" : "Agendar turno"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarOff } from "lucide-react";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import { hoyArgentinaISO, horaArgentinaHHmm } from "@/lib/formato";
import {
  franjasDelDia,
  esDiaDeAtencion,
  proximoDiaDeAtencion,
  diasDeAtencionEnTexto,
  ETIQUETA_MOTIVO,
} from "@/lib/agenda";
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

/**
 * Duración del turno, en minutos y como texto (viene de un `<select>`).
 *
 * El DTO acota a un entero positivo de hasta 480 (`agendarTurnoDto`); acá solo
 * se exigía "no vacío". Se comparte con FormularioReprogramar, que valida lo
 * mismo contra el mismo DTO.
 */
export const duracionTurno = z
  .string()
  .min(1)
  .refine((v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 && n <= 480;
  }, "La duración debe estar entre 1 y 480 minutos");

/** Esquema del formulario de turno. Exportado para el test de coherencia. */
export const esquema = z.object({
  pacienteId: z.string().min(1, "Elegí un paciente"),
  fecha: z.string().min(1, "Elegí una fecha"),
  hora: z.string().min(1, "Elegí una hora"),
  duracion: duracionTurno,
  // El DTO corta en 1000: sin esto, una nota larga se escribía entera y se
  // perdía al enviar.
  notas: z.string().max(1000, "Hasta 1000 caracteres").optional(),
});
type DatosFormulario = z.infer<typeof esquema>;

interface PropsFormularioTurno {
  onTerminado: () => void;
  pacienteIdInicial?: string;
  /**
   * El turno es SÍ o SÍ de ese paciente (se agenda desde su ficha): se oculta
   * el selector en vez de dejar cambiarlo, que en esa pantalla no significa
   * nada bueno.
   */
  pacienteFijo?: boolean;
  /** Fecha (YYYY-MM-DD) con la que abrir el formulario (ej. la casilla del calendario). */
  fechaInicial?: string;
}

/**
 * Formulario para agendar un turno. Los horarios (paso/rango), los días de
 * atención y la duración por defecto salen de la Configuración del consultorio;
 * se espera a que cargue para inicializar los valores correctos.
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
  pacienteFijo,
  fechaInicial,
  config,
}: PropsFormularioTurno & { config: ConfiguracionSalidaDto }) {
  const { agendar, listar } = useTurnos();

  const hoy = hoyArgentinaISO();
  const pedida = fechaInicial && fechaInicial >= hoy ? fechaInicial : hoy;
  // Si el día pedido no se atiende, se abre directamente en el próximo que sí:
  // el formulario nunca arranca en un día donde nada se puede agendar.
  const fechaResuelta = proximoDiaDeAtencion(config, pedida);

  const duraciones = useMemo(() => {
    const base = new Set([30, 45, 60, 90, config.turnoDuracionMinutos]);
    return [...base].sort((a, b) => a - b).map(String);
  }, [config.turnoDuracionMinutos]);

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      pacienteId: pacienteIdInicial ?? "",
      fecha: fechaResuelta,
      hora: "",
      duracion: String(config.turnoDuracionMinutos),
      notas: "",
    },
  });

  const fechaActual = form.watch("fecha");
  const horaActual = form.watch("hora");
  const duracionActual = Number(form.watch("duracion"));

  const diaHabil = esDiaDeAtencion(config, fechaActual);

  // Turnos del día elegido: son los que ocupan las franjas. Solo se piden
  // cuando el día se atiende (si no, no hay grilla que pintar).
  const turnosDelDia = listar(
    { fecha: fechaActual ? new Date(fechaActual) : undefined },
    { enabled: Boolean(fechaActual) && diaHabil },
  );

  const franjas = useMemo(
    () =>
      franjasDelDia({
        config,
        fechaISO: fechaActual,
        duracionMinutos: duracionActual || config.turnoDuracionMinutos,
        ocupados: turnosDelDia.data ?? [],
        hoyISO: hoy,
        ahoraHHmm: horaArgentinaHHmm(),
      }),
    [config, fechaActual, duracionActual, turnosDelDia.data, hoy],
  );

  const cargandoFranjas = diaHabil && turnosDelDia.isLoading;
  const primeraLibre = franjas.find((f) => f.disponible)?.hora ?? "";

  // Reubica la hora cuando la elegida deja de estar disponible: cambió el día,
  // cambió la duración, o entró un turno nuevo en esa franja mientras el
  // diálogo estaba abierto. Sin esto el formulario se envía con una hora que
  // el servidor va a rechazar.
  useEffect(() => {
    if (cargandoFranjas) return;
    const elegida = franjas.find((f) => f.hora === horaActual);
    if (!elegida?.disponible) {
      form.setValue("hora", primeraLibre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [franjas, cargandoFranjas]);

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

  const sinHorarios = !cargandoFranjas && primeraLibre === "";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        {!pacienteFijo && (
          <FormField
            control={form.control}
            name="pacienteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paciente</FormLabel>
                <FormControl>
                  <SelectorPaciente
                    valor={field.value || null}
                    onCambiar={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                    {franjas.map((franja) => (
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
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={agendar.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={agendar.isPending || !diaHabil || sinHorarios}
          >
            {agendar.isPending ? "Agendando…" : "Agendar turno"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

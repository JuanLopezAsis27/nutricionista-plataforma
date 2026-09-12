"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { hoyISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
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
import { SelectorPacientesMultiple } from "@/componentes/pacientes/SelectorPacientesMultiple";

export const esquema = z
  .object({
    planId: z.string().min(1, "Elegí un plan"),
    pacienteId: z.string().min(1, "Elegí un paciente"),
    fechaInicio: z.string().min(1, "Elegí la fecha de inicio"),
    fechaFin: z.string().optional(),
  })
  .refine((d) => !d.fechaFin || d.fechaFin >= d.fechaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["fechaFin"],
  });
type DatosFormulario = z.infer<typeof esquema>;

export const esquemaMultiple = z
  .object({
    pacienteIds: z
      .array(z.string().min(1))
      .min(1, "Elegí al menos un paciente"),
    fechaInicio: z.string().min(1, "Elegí la fecha de inicio"),
    fechaFin: z.string().optional(),
  })
  .refine((d) => !d.fechaFin || d.fechaFin >= d.fechaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["fechaFin"],
  });
type DatosFormularioMultiple = z.infer<typeof esquemaMultiple>;

interface Props {
  /** Plan prefijado (asignación desde la ficha del plan). Sin él se elige acá. */
  planId?: string;
  /** Paciente prefijado (asignación desde la ficha del paciente). */
  pacienteIdFijo?: string;
  onTerminado: () => void;
}

/**
 * Formulario para asignar un plan a uno o varios pacientes.
 *
 * Los dos extremos originales son opcionales porque se entra desde las dos
 * puntas: desde la ficha del plan (falta el paciente) y desde la ficha del
 * paciente (falta el plan). El lado que viene fijado no se muestra: cambiarlo
 * ahí sería asignar algo distinto de lo que dice la pantalla.
 *
 * Desde la ficha del PLAN (planId fijo, sin paciente) se puede elegir MÁS DE
 * uno: es una tanda ("asignarle este plan a estos cinco"), y forzar una
 * asignación por vez ahí sería el mismo viaje de ida y vuelta que ya se sacó
 * en el resto del módulo. Desde la ficha del PACIENTE el destino es él y nadie
 * más: ahí no hay nada que multiplicar.
 */
export function FormularioAsignacionPlan({
  planId,
  pacienteIdFijo,
  onTerminado,
}: Props) {
  if (planId && !pacienteIdFijo) {
    return (
      <FormularioAsignacionMultiple planId={planId} onTerminado={onTerminado} />
    );
  }

  return (
    <FormularioAsignacionUnica
      planId={planId}
      pacienteIdFijo={pacienteIdFijo}
      onTerminado={onTerminado}
    />
  );
}

function FormularioAsignacionUnica({
  planId,
  pacienteIdFijo,
  onTerminado,
}: {
  planId?: string;
  pacienteIdFijo?: string;
  onTerminado: () => void;
}) {
  const { asignar, delPaciente, listar } = usePlanes();

  // Solo planes reales y vigentes: una plantilla no se asigna (se clona) y un
  // plan archivado ya se dio de baja.
  const planes = listar(
    { esPlantilla: false, incluirArchivados: false },
    { enabled: !planId },
  );

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      planId: planId ?? "",
      pacienteId: pacienteIdFijo ?? "",
      fechaInicio: hoyISO(),
      fechaFin: "",
    },
  });

  const pacienteId = form.watch("pacienteId");
  const planElegido = form.watch("planId");
  const planActivo = delPaciente(
    { pacienteId },
    { enabled: Boolean(pacienteId) },
  );

  function alEnviar(datos: DatosFormulario) {
    asignar.mutate(
      {
        planId: datos.planId,
        pacienteId: datos.pacienteId,
        fechaInicio: new Date(datos.fechaInicio),
        fechaFin: datos.fechaFin ? new Date(datos.fechaFin) : null,
      },
      { onSuccess: onTerminado },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        {!planId && (
          <FormField
            control={form.control}
            name="planId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={planes.isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          planes.isLoading
                            ? "Cargando planes…"
                            : "Elegí un plan"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(planes.data ?? []).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!planes.isLoading && (planes.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay planes cargados. Creá uno en Planes
                    nutricionales.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!pacienteIdFijo && (
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

        {pacienteId &&
          planActivo.data &&
          planActivo.data.id !== planElegido && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-300/60 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Este paciente ya tiene un plan activo («{planActivo.data.nombre}
                »). Al asignar este plan, el anterior se desactivará.
              </span>
            </div>
          )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fechaInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de inicio</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fechaFin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de fin (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={asignar.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={asignar.isPending}>
            {asignar.isPending ? "Asignando…" : "Asignar plan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * Desde la ficha del PLAN: elegir varios pacientes a la vez para el mismo
 * plan y período. Cada asignación es independiente en el servidor —una que
 * falle no aborta a las demás—, así que acá no hay advertencia de "reemplaza
 * el plan activo" por paciente: son demasiados para leerla una por una, y el
 * mensaje de éxito ya cuenta cuántas anduvieron.
 */
function FormularioAsignacionMultiple({
  planId,
  onTerminado,
}: {
  planId: string;
  onTerminado: () => void;
}) {
  const { asignarAVarios } = usePlanes();

  const form = useForm<DatosFormularioMultiple>({
    resolver: zodResolver(esquemaMultiple),
    defaultValues: {
      pacienteIds: [],
      fechaInicio: hoyISO(),
      fechaFin: "",
    },
  });

  function alEnviar(datos: DatosFormularioMultiple) {
    asignarAVarios.mutate(
      {
        planId,
        pacienteIds: datos.pacienteIds,
        fechaInicio: new Date(datos.fechaInicio),
        fechaFin: datos.fechaFin ? new Date(datos.fechaFin) : null,
      },
      { onSuccess: onTerminado },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <FormField
          control={form.control}
          name="pacienteIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pacientes</FormLabel>
              <FormControl>
                <SelectorPacientesMultiple
                  valores={field.value}
                  onCambiar={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fechaInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de inicio</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fechaFin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de fin (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={asignarAVarios.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={asignarAVarios.isPending}>
            {asignarAVarios.isPending ? "Asignando…" : "Asignar plan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

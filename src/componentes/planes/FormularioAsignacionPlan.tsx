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

interface Props {
  /** Plan prefijado (asignación desde la ficha del plan). Sin él se elige acá. */
  planId?: string;
  /** Paciente prefijado (asignación desde la ficha del paciente). */
  pacienteIdFijo?: string;
  onTerminado: () => void;
}

/**
 * Formulario para asignar un plan a un paciente.
 *
 * Los dos extremos son opcionales porque se entra desde las dos puntas: desde
 * la ficha del plan (falta el paciente) y desde la ficha del paciente (falta
 * el plan). El lado que viene fijado no se muestra: cambiarlo ahí sería
 * asignar algo distinto de lo que dice la pantalla.
 */
export function FormularioAsignacionPlan({
  planId,
  pacienteIdFijo,
  onTerminado,
}: Props) {
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

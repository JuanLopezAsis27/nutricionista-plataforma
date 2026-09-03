"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
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
    planSemanalId: z.string().min(1, "Elegí un plan semanal"),
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
  /** Plan prefijado (asignación desde la lista de planes semanales). */
  planSemanalId?: string;
  /** Paciente prefijado (asignación desde su ficha). */
  pacienteIdFijo?: string;
  onTerminado: () => void;
}

/**
 * Formulario para asignar un plan semanal a un paciente.
 *
 * Igual que el de planes, acepta los dos extremos como opcionales porque se
 * entra desde las dos puntas, y el lado fijado no se muestra: cambiarlo ahí
 * sería asignar algo distinto de lo que dice la pantalla.
 */
export function FormularioAsignacionPlanSemanal({
  planSemanalId,
  pacienteIdFijo,
  onTerminado,
}: Props) {
  const { asignar, listar, delPaciente } = usePlanesSemanales();

  // Para el selector alcanza con una página grande: son menús de referencia,
  // no un listado que crezca sin techo.
  const planes = listar(
    { pagina: 1, porPagina: 100 },
    { enabled: !planSemanalId },
  );

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      planSemanalId: planSemanalId ?? "",
      pacienteId: pacienteIdFijo ?? "",
      fechaInicio: hoyISO(),
      fechaFin: "",
    },
  });

  const pacienteId = form.watch("pacienteId");
  const planElegido = form.watch("planSemanalId");
  const vigente = delPaciente({ pacienteId }, { enabled: Boolean(pacienteId) });

  function alEnviar(datos: DatosFormulario) {
    asignar.mutate(
      {
        planSemanalId: datos.planSemanalId,
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
        {!planSemanalId && (
          <FormField
            control={form.control}
            name="planSemanalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan semanal</FormLabel>
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
                            : "Elegí un plan semanal"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(planes.data?.planes ?? []).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!planes.isLoading &&
                  (planes.data?.planes ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Todavía no hay planes semanales. Creá uno en Planes →
                      Planes semanales.
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

        {pacienteId && vigente.data && vigente.data.plan.id !== planElegido && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-300/60 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Este paciente ya sigue el plan semanal «{vigente.data.plan.nombre}
              ». Al asignar este, el anterior se desactiva y queda en el
              historial.
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
            {asignar.isPending ? "Asignando…" : "Asignar plan semanal"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

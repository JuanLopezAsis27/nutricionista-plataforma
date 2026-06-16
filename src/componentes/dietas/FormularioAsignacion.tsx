"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { useDietas } from "@/lib/hooks/useDietas";
import { hoyISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { SelectorPaciente } from "@/componentes/pacientes/SelectorPaciente";

const esquema = z
  .object({
    pacienteId: z.string().min(1, "Elegí un paciente"),
    fechaInicio: z.string().min(1, "Elegí la fecha de inicio"),
    fechaFin: z.string().optional(),
  })
  .refine((d) => !d.fechaFin || d.fechaFin >= d.fechaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["fechaFin"],
  });
type DatosFormulario = z.infer<typeof esquema>;

interface PropsFormularioAsignacion {
  dietaId: string;
  onTerminado: () => void;
}

/** Formulario para asignar una dieta a un paciente. */
export function FormularioAsignacion({ dietaId, onTerminado }: PropsFormularioAsignacion) {
  const { asignar, delPaciente } = useDietas();

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: { pacienteId: "", fechaInicio: hoyISO(), fechaFin: "" },
  });

  const pacienteId = form.watch("pacienteId");
  const dietaActiva = delPaciente(
    { pacienteId },
    { enabled: Boolean(pacienteId) },
  );

  function alEnviar(datos: DatosFormulario) {
    asignar.mutate(
      {
        dietaId,
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

        {pacienteId && dietaActiva.data && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Este paciente ya tiene una dieta activa («{dietaActiva.data.nombre}»). Al asignar
              esta dieta, la anterior se desactivará.
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
          <Button type="button" variant="outline" onClick={onTerminado} disabled={asignar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={asignar.isPending}>
            {asignar.isPending ? "Asignando…" : "Asignar dieta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

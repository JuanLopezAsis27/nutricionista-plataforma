"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { hoyISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
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

/** Slots horarios de 30 minutos entre 08:00 y 20:00. */
const HORARIOS: string[] = (() => {
  const slots: string[] = [];
  for (let minutos = 8 * 60; minutos <= 20 * 60; minutos += 30) {
    const h = String(Math.floor(minutos / 60)).padStart(2, "0");
    const m = String(minutos % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
})();

const DURACIONES = ["30", "45", "60", "90"];

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
}

/** Formulario para agendar un turno. */
export function FormularioTurno({ onTerminado, pacienteIdInicial }: PropsFormularioTurno) {
  const { agendar } = useTurnos();

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      pacienteId: pacienteIdInicial ?? "",
      fecha: hoyISO(),
      hora: "09:00",
      duracion: "30",
      notas: "",
    },
  });

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
                  <Input type="date" min={hoyISO()} {...field} />
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
                    {HORARIOS.map((hora) => (
                      <SelectItem key={hora} value={hora}>
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
                  {DURACIONES.map((d) => (
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

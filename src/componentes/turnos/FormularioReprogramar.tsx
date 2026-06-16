"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { aFechaISO, hoyISO } from "@/lib/formato";
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
  fecha: z.string().min(1, "Elegí una fecha"),
  hora: z.string().min(1, "Elegí una hora"),
  duracion: z.string().min(1),
});
type DatosFormulario = z.infer<typeof esquema>;

interface PropsFormularioReprogramar {
  turno: TurnoSalidaDto;
  onTerminado: () => void;
}

/** Formulario para reprogramar (cambiar día/hora/duración de) un turno. */
export function FormularioReprogramar({ turno, onTerminado }: PropsFormularioReprogramar) {
  const { reprogramar } = useTurnos();

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      fecha: aFechaISO(turno.fecha),
      hora: turno.hora,
      duracion: String(turno.duracionMinutos),
    },
  });

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

  // Asegura que la hora actual esté disponible aunque no caiga en un slot.
  const horarios = HORARIOS.includes(turno.hora) ? HORARIOS : [turno.hora, ...HORARIOS];

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
                    {horarios.map((hora) => (
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onTerminado} disabled={reprogramar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={reprogramar.isPending}>
            {reprogramar.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ObjetivoSalidaDto } from "@/aplicacion/dtos/objetivo.dto";
import { PRIORIDADES_OBJETIVO } from "@/dominio/entidades/Objetivo";
import { useObjetivos } from "@/lib/hooks/useObjetivos";
import { aFechaISO } from "@/lib/formato";
import { ETIQUETAS_PRIORIDAD } from "./etiquetas";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

const esquema = z.object({
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  descripcion: z.string().max(2000),
  prioridad: z.enum(PRIORIDADES_OBJETIVO),
  fechaObjetivo: z.string(),
});
type DatosFormulario = z.infer<typeof esquema>;

interface Props {
  pacienteId: string;
  objetivoInicial?: ObjetivoSalidaDto | null;
  onTerminado: () => void;
}

/** Alta/edición de un objetivo (título, prioridad, fecha meta). */
export function FormularioObjetivo({ pacienteId, objetivoInicial, onTerminado }: Props) {
  const { crear, actualizar } = useObjetivos();
  const enviando = crear.isPending || actualizar.isPending;

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      titulo: objetivoInicial?.titulo ?? "",
      descripcion: objetivoInicial?.descripcion ?? "",
      prioridad: objetivoInicial?.prioridad ?? "MEDIA",
      fechaObjetivo: objetivoInicial?.fechaObjetivo
        ? aFechaISO(objetivoInicial.fechaObjetivo)
        : "",
    },
  });

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      titulo: datos.titulo,
      descripcion: datos.descripcion.trim() || null,
      prioridad: datos.prioridad,
      fechaObjetivo: datos.fechaObjetivo ? new Date(datos.fechaObjetivo) : null,
    };
    if (objetivoInicial) {
      actualizar.mutate({ id: objetivoInicial.id, ...cuerpo }, { onSuccess: onTerminado });
    } else {
      crear.mutate({ pacienteId, ...cuerpo }, { onSuccess: onTerminado });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <FormField
          control={form.control}
          name="titulo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Bajar 5 kg para octubre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="prioridad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label="Prioridad">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIORIDADES_OBJETIVO.map((prioridad) => (
                      <SelectItem key={prioridad} value={prioridad}>
                        {ETIQUETAS_PRIORIDAD[prioridad]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fechaObjetivo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha meta (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onTerminado} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : objetivoInicial ? "Guardar cambios" : "Crear objetivo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

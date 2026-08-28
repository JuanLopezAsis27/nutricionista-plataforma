"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ObjetivoSalidaDto } from "@/aplicacion/dtos/objetivo.dto";
import { PRIORIDADES_OBJETIVO } from "@/dominio/entidades/Objetivo";
import { useObjetivos } from "@/lib/hooks/useObjetivos";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { aFechaISO, formatearNumero } from "@/lib/formato";
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

/** Valor del selector cuando el plan no persigue ninguna meta numérica. */
const SIN_META = "SIN_META";

const esquema = z.object({
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  descripcion: z.string().max(2000),
  prioridad: z.enum(PRIORIDADES_OBJETIVO),
  fechaObjetivo: z.string(),
  objetivoComposicionId: z.string(),
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
  // Las metas numéricas del paciente: este plan puede perseguir una.
  const { obtenerComposicion } = useEvaluacion();
  const composicion = obtenerComposicion({ pacienteId });
  const metas = composicion.data?.objetivos ?? [];
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
      objetivoComposicionId: objetivoInicial?.objetivoComposicionId ?? SIN_META,
    },
  });

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      titulo: datos.titulo,
      descripcion: datos.descripcion.trim() || null,
      prioridad: datos.prioridad,
      fechaObjetivo: datos.fechaObjetivo ? new Date(datos.fechaObjetivo) : null,
      objetivoComposicionId:
        datos.objetivoComposicionId === SIN_META
          ? null
          : datos.objetivoComposicionId,
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

        {/* El vínculo con la meta medible: el plan dice QUÉ se hace, la meta
            dice a DÓNDE se llega. Juntos, el plan muestra progreso real. */}
        <FormField
          control={form.control}
          name="objetivoComposicionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meta de composición que persigue (opcional)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SIN_META}>
                    Ninguna — objetivo solo cualitativo
                  </SelectItem>
                  {metas.map((meta) => (
                    <SelectItem key={meta.id} value={meta.id}>
                      {meta.descripcion}: {formatearNumero(meta.valorObjetivo)}
                      {meta.proyeccion.unidad ? ` ${meta.proyeccion.unidad}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {metas.length === 0
                  ? "El paciente no tiene metas numéricas cargadas. Se plantean en la pestaña Antropometría."
                  : "Vinculada, la tarjeta muestra el progreso medido en las antropometrías en vez de una estimación."}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

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

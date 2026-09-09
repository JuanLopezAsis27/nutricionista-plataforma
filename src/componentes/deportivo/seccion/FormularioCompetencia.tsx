"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CompetenciaSalidaDto } from "@/aplicacion/dtos/deportivo.dto";
import { IMPORTANCIAS_COMPETENCIA } from "@/dominio/entidades/Competencia";
import { useDeportivo } from "@/lib/hooks/useDeportivo";
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
import { ETIQUETA_IMPORTANCIA } from "./comun";
import { esquemaCompetencia, type DatosCompetenciaForm } from "./esquemas";

/** Alta y edición de una competencia del calendario del deportista. */
export function FormularioCompetencia({
  pacienteId,
  competencia,
  onTerminado,
}: {
  pacienteId: string;
  competencia: CompetenciaSalidaDto | null;
  onTerminado: () => void;
}) {
  const { crearCompetencia, actualizarCompetencia } = useDeportivo();
  const enviando =
    crearCompetencia.isPending || actualizarCompetencia.isPending;

  const form = useForm<DatosCompetenciaForm>({
    resolver: zodResolver(esquemaCompetencia),
    defaultValues: {
      nombre: competencia?.nombre ?? "",
      fecha: competencia?.fecha
        ? new Date(competencia.fecha).toISOString().slice(0, 10)
        : "",
      lugar: competencia?.lugar ?? "",
      importancia: competencia?.importancia ?? "B",
      objetivo: competencia?.objetivo ?? "",
      resultado: competencia?.resultado ?? "",
      notas: competencia?.notas ?? "",
    },
  });

  function alEnviar(datos: DatosCompetenciaForm) {
    const cuerpo = {
      nombre: datos.nombre,
      fecha: new Date(datos.fecha),
      lugar: datos.lugar.trim() || null,
      importancia: datos.importancia,
      objetivo: datos.objetivo.trim() || null,
      resultado: datos.resultado.trim() || null,
      notas: datos.notas.trim() || null,
    };
    if (competencia) {
      actualizarCompetencia.mutate(
        { id: competencia.id, ...cuerpo },
        { onSuccess: onTerminado },
      );
    } else {
      crearCompetencia.mutate(
        { pacienteId, ...cuerpo },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Competencia</FormLabel>
              <FormControl>
                <Input placeholder="Maratón de Buenos Aires" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="importancia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importancia</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {IMPORTANCIAS_COMPETENCIA.map((i) => (
                      <SelectItem key={i} value={i}>
                        {ETIQUETA_IMPORTANCIA[i]}
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
          name="lugar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lugar (opcional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="objetivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej. sub 3h30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="resultado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resultado (se completa después)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
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
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando
              ? "Guardando…"
              : competencia
                ? "Guardar cambios"
                : "Agregar competencia"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Pestaña Deporte de la ficha: perfil deportivo + calendario de competencias. */

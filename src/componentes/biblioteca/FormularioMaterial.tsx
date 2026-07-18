"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Link2 } from "lucide-react";
import type { MaterialSalidaDto } from "@/aplicacion/dtos/material.dto";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import type { TipoMaterial } from "@/dominio/entidades/MaterialBiblioteca";
import { useBiblioteca } from "@/lib/hooks/useBiblioteca";
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
import { Tabs, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";

const esquema = z.object({
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  descripcion: z.string().max(2000),
  url: z.string().max(2000),
  categoria: z.string().max(80),
  etiquetas: z.string().max(500),
});
type DatosFormulario = z.infer<typeof esquema>;

interface Props {
  materialInicial?: MaterialSalidaDto | null;
  onTerminado: () => void;
}

/**
 * Alta/edición de un material: archivo (subida al bucket) o enlace externo.
 * En edición el tipo no se cambia.
 */
export function FormularioMaterial({ materialInicial, onTerminado }: Props) {
  const { crear, actualizar } = useBiblioteca();
  const enviando = crear.isPending || actualizar.isPending;

  const [tipo, setTipo] = useState<TipoMaterial>(materialInicial?.tipo ?? "ARCHIVO");
  const [archivoSubido, setArchivoSubido] = useState<ArchivoSalidaDto | null>(null);

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      titulo: materialInicial?.titulo ?? "",
      descripcion: materialInicial?.descripcion ?? "",
      url: materialInicial?.url ?? "",
      categoria: materialInicial?.categoria ?? "",
      etiquetas: (materialInicial?.etiquetas ?? []).join(", "),
    },
  });

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      titulo: datos.titulo,
      descripcion: datos.descripcion.trim() || null,
      url: tipo === "ENLACE" ? datos.url.trim() || null : null,
      categoria: datos.categoria.trim() || null,
      etiquetas: datos.etiquetas
        .split(",")
        .map((etiqueta) => etiqueta.trim())
        .filter(Boolean),
    };

    if (materialInicial) {
      actualizar.mutate({ id: materialInicial.id, ...cuerpo }, { onSuccess: onTerminado });
    } else {
      crear.mutate(
        { tipo, ...cuerpo, archivoId: archivoSubido?.id ?? null },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        {/* Tipo (solo en alta) */}
        {!materialInicial && (
          <Tabs value={tipo} onValueChange={(valor) => setTipo(valor as TipoMaterial)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ARCHIVO">
                <FileText className="mr-1.5 h-4 w-4" /> Archivo
              </TabsTrigger>
              <TabsTrigger value="ENLACE">
                <Link2 className="mr-1.5 h-4 w-4" /> Enlace
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <FormField
          control={form.control}
          name="titulo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Guía de porciones con las manos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {tipo === "ENLACE" ? (
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enlace (http/https)</FormLabel>
                <FormControl>
                  <Input placeholder="https://…" inputMode="url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : materialInicial ? (
          <p className="text-sm text-muted-foreground">
            Archivo: {materialInicial.archivo?.nombreOriginal ?? "—"} (no se cambia; creá un
            material nuevo si necesitás otro archivo).
          </p>
        ) : archivoSubido ? (
          <p className="rounded-md border p-2 text-sm">
            Archivo listo: <span className="font-medium">{archivoSubido.nombreOriginal}</span>
          </p>
        ) : (
          <SubidorArchivo
            contexto="biblioteca"
            onSubido={(archivo) => setArchivoSubido(archivo)}
          />
        )}

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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="educación, recetas, hábitos…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="etiquetas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etiquetas (separadas por coma)</FormLabel>
                <FormControl>
                  <Input placeholder="porciones, inicio" {...field} />
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
          <Button
            type="submit"
            disabled={enviando || (!materialInicial && tipo === "ARCHIVO" && !archivoSubido)}
          >
            {enviando ? "Guardando…" : materialInicial ? "Guardar cambios" : "Agregar material"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

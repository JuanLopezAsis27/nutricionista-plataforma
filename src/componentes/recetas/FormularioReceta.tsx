"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, X } from "lucide-react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import { useRecetas } from "@/lib/hooks/useRecetas";
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
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";

const numeroOpcional = z
  .string()
  .refine((v) => v === "" || Number(v.replace(",", ".")) >= 0, "Debe ser un número positivo");

const esquema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(1000),
  porciones: numeroOpcional,
  ingredientes: z.string().max(10000),
  preparacion: z.string().max(5000),
  etiquetas: z.string().max(500),
  calorias: numeroOpcional,
  proteinasG: numeroOpcional,
  carbohidratosG: numeroOpcional,
  grasasG: numeroOpcional,
});
type DatosFormulario = z.infer<typeof esquema>;

function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const numero = Number(valor.trim().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

interface PropsFormularioReceta {
  recetaInicial?: RecetaSalidaDto | null;
  onTerminado: () => void;
}

/**
 * Alta/edición de una receta: ingredientes (uno por línea), preparación,
 * macros por porción, etiquetas (separadas por coma) y fotos.
 */
export function FormularioReceta({ recetaInicial, onTerminado }: PropsFormularioReceta) {
  const { crear, actualizar } = useRecetas();
  const enviando = crear.isPending || actualizar.isPending;

  // Fotos nuevas subidas durante esta edición (se vinculan al guardar).
  const [fotosNuevas, setFotosNuevas] = useState<ArchivoSalidaDto[]>([]);

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: recetaInicial?.nombre ?? "",
      descripcion: recetaInicial?.descripcion ?? "",
      porciones: recetaInicial?.porciones?.toString() ?? "",
      ingredientes: (recetaInicial?.ingredientes ?? []).join("\n"),
      preparacion: recetaInicial?.preparacion ?? "",
      etiquetas: (recetaInicial?.etiquetas ?? []).join(", "),
      calorias: recetaInicial?.calorias?.toString() ?? "",
      proteinasG: recetaInicial?.proteinasG?.toString() ?? "",
      carbohidratosG: recetaInicial?.carbohidratosG?.toString() ?? "",
      grasasG: recetaInicial?.grasasG?.toString() ?? "",
    },
  });

  function alEnviar(datos: DatosFormulario) {
    const porciones = aNumero(datos.porciones);
    const calorias = aNumero(datos.calorias);
    const cuerpo = {
      nombre: datos.nombre,
      descripcion: datos.descripcion.trim() || null,
      porciones: porciones != null ? Math.round(porciones) : null,
      preparacion: datos.preparacion.trim() || null,
      ingredientes: datos.ingredientes
        .split("\n")
        .map((linea) => linea.trim())
        .filter(Boolean),
      etiquetas: datos.etiquetas
        .split(",")
        .map((etiqueta) => etiqueta.trim())
        .filter(Boolean),
      calorias: calorias != null ? Math.round(calorias) : null,
      proteinasG: aNumero(datos.proteinasG),
      carbohidratosG: aNumero(datos.carbohidratosG),
      grasasG: aNumero(datos.grasasG),
    };
    const fotoIds = fotosNuevas.map((foto) => foto.id);

    if (recetaInicial) {
      actualizar.mutate(
        { id: recetaInicial.id, ...cuerpo, fotoIdsNuevos: fotoIds },
        { onSuccess: onTerminado },
      );
    } else {
      crear.mutate({ ...cuerpo, fotoIds }, { onSuccess: onTerminado });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Tortilla de espinaca" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="porciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Porciones</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        <FormField
          control={form.control}
          name="ingredientes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ingredientes (uno por línea)</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder={"2 huevos\n1 taza de espinaca"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preparacion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preparación</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Pasos de la preparación…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">Macros por porción (opcionales)</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["calorias", "Calorías"],
                ["proteinasG", "Proteínas (g)"],
                ["carbohidratosG", "Carbohidratos (g)"],
                ["grasasG", "Grasas (g)"],
              ] as const
            ).map(([nombre, etiqueta]) => (
              <FormField
                key={nombre}
                control={form.control}
                name={nombre}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{etiqueta}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="—" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </fieldset>

        <FormField
          control={form.control}
          name="etiquetas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiquetas (separadas por coma)</FormLabel>
              <FormControl>
                <Input placeholder="vegetariano, sin TACC, alta proteína" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fotos */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ImagePlus className="h-4 w-4" /> Fotos
          </p>
          {(recetaInicial?.fotos.length ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              La receta ya tiene {recetaInicial!.fotos.length} foto(s). Las nuevas se agregan.
            </p>
          )}
          {fotosNuevas.length > 0 && (
            <ul className="space-y-1">
              {fotosNuevas.map((foto) => (
                <li
                  key={foto.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="truncate">{foto.nombreOriginal}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar foto"
                    onClick={() =>
                      setFotosNuevas((previas) => previas.filter((f) => f.id !== foto.id))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <SubidorArchivo
            contexto="receta"
            accept="image/*"
            onSubido={(archivo) => setFotosNuevas((previas) => [...previas, archivo])}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onTerminado} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : recetaInicial ? "Guardar cambios" : "Crear receta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

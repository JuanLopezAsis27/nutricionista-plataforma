"use client";

import { useFieldArray, type Control } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  FormField,
  FormItem,
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
import type { DatosFormulario } from "./esquema";

/**
 * Equivalencias y recomendaciones: las dos listas planas del plan.
 *
 * Viven en el mismo archivo porque comparten la forma exacta —encabezado con
 * botón de agregar, filas con dos campos y un botón de quitar— y separarlas en
 * dos módulos de 60 líneas casi idénticas invitaría a que se desincronizaran.
 * Ambas solo aplican a la modalidad APP.
 */

/** "1 fruta" = "1 manzana o 1 banana chica". */
export function SeccionEquivalencias({
  control,
}: {
  control: Control<DatosFormulario>;
}) {
  const equivalencias = useFieldArray({ control, name: "equivalencias" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Equivalencias</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => equivalencias.append({ titulo: "", detalle: "" })}
        >
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>
      {equivalencias.fields.map((equivalencia, indice) => (
        <div
          key={equivalencia.id}
          className="flex flex-wrap items-start gap-2 sm:flex-nowrap"
        >
          <FormField
            control={control}
            name={`equivalencias.${indice}.titulo`}
            render={({ field }) => (
              <FormItem className="w-full sm:w-56">
                <FormControl>
                  <Input placeholder="1 fruta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`equivalencias.${indice}.detalle`}
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
                <FormControl>
                  <Input placeholder="1 manzana o 1 banana chica" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Quitar equivalencia"
            onClick={() => equivalencias.remove(indice)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

/** Indicaciones sueltas, nutricionales o de salud. */
export function SeccionRecomendaciones({
  control,
}: {
  control: Control<DatosFormulario>;
}) {
  const recomendaciones = useFieldArray({ control, name: "recomendaciones" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Recomendaciones</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            recomendaciones.append({ tipo: "NUTRICIONAL", texto: "" })
          }
        >
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>
      {recomendaciones.fields.map((recomendacion, indice) => (
        <div
          key={recomendacion.id}
          className="flex flex-wrap items-start gap-2 sm:flex-nowrap"
        >
          <FormField
            control={control}
            name={`recomendaciones.${indice}.tipo`}
            render={({ field }) => (
              <FormItem className="w-full sm:w-44">
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label="Tipo de recomendación">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NUTRICIONAL">Nutricional</SelectItem>
                    <SelectItem value="SALUD">Salud</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`recomendaciones.${indice}.texto`}
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
                <FormControl>
                  <Input placeholder="Tomar 2 L de agua por día" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Quitar recomendación"
            onClick={() => recomendaciones.remove(indice)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

"use client";

import type { UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import type { DatosFormulario } from "./esquema";

/** Una fila de la tabla de ingredientes: nombre, cantidad y macros por 100 g. */
export function FilaIngrediente({
  form,
  indice,
  onQuitar,
}: {
  form: UseFormReturn<DatosFormulario>;
  indice: number;
  onQuitar: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed p-3">
      <div className="flex items-start gap-2">
        <FormField
          control={form.control}
          name={`ingredientes.${indice}.nombre`}
          render={({ field }) => (
            <FormItem className="min-w-0 flex-1">
              <FormControl>
                <Input placeholder="Ingrediente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-24 shrink-0">
          <FormField
            control={form.control}
            name={`ingredientes.${indice}.cantidadGramos`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="g"
                    aria-label="Gramos"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quitar ingrediente"
          className="shrink-0"
          onClick={onQuitar}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 pr-10">
        {(
          [
            ["caloriasPor100", "kcal/100g"],
            ["proteinasPor100", "P/100g"],
            ["carbohidratosPor100", "C/100g"],
            ["grasasPor100", "G/100g"],
          ] as const
        ).map(([nombre, etiqueta]) => (
          <FormField
            key={nombre}
            control={form.control}
            name={`ingredientes.${indice}.${nombre}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[0.65rem] text-muted-foreground">
                  {etiqueta}
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="—"
                    className="h-8"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Buscador de alimentos contra Open Food Facts; agrega el elegido como ingrediente. */

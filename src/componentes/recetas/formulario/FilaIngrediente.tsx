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
import { CampoCantidadAlimento } from "@/componentes/comunes/alimentos/CampoCantidadAlimento";
import { porCien } from "@/componentes/comunes/alimentos/cantidad";

/**
 * Una fila de la tabla de ingredientes: nombre, cantidad (en g/ml o en una
 * medida casera) y macros por 100 g o 100 ml.
 */
export function FilaIngrediente({
  form,
  indice,
  onQuitar,
}: {
  form: UseFormReturn<DatosFormulario>;
  indice: number;
  onQuitar: () => void;
}) {
  const ingrediente = form.watch(`ingredientes.${indice}`);
  const cien = porCien(ingrediente.unidadBase);
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
        <CampoCantidadAlimento
          className="w-40 shrink-0 sm:w-48"
          altoCompacto={false}
          valor={ingrediente}
          unidadEditable={!ingrediente.alimentoOrigenId}
          onCambiar={(nuevo) =>
            form.setValue(
              `ingredientes.${indice}`,
              { ...ingrediente, ...nuevo },
              { shouldDirty: true },
            )
          }
        />
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
            ["caloriasPor100", `kcal/${cien}`],
            ["proteinasPor100", `P/${cien}`],
            ["carbohidratosPor100", `C/${cien}`],
            ["grasasPor100", `G/${cien}`],
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

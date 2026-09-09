"use client";

import type { Control } from "react-hook-form";
import { Input } from "@/componentes/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import type { DatosFormulario } from "./esquema";

/**
 * Las cuatro metas, en el orden en que se leen en una etiqueta nutricional.
 * Fuera del JSX para que agregar una sea tocar la lista y nada más.
 */
const METAS = [
  ["caloriasMeta", "Calorías (kcal)"],
  ["proteinasMetaG", "Proteínas (g)"],
  ["carbohidratosMetaG", "Carbohidratos (g)"],
  ["grasasMetaG", "Grasas (g)"],
] as const;

/** Metas diarias de macronutrientes. Todas opcionales, en las dos modalidades. */
export function SeccionMetasMacros({
  control,
}: {
  control: Control<DatosFormulario>;
}) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">
        Metas diarias (opcionales)
      </legend>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METAS.map(([nombre, etiqueta]) => (
          <FormField
            key={nombre}
            control={control}
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
  );
}

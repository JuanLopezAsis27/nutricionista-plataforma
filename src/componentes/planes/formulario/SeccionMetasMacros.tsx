"use client";

import type { Control } from "react-hook-form";
import type { TipoMeta } from "@/dominio/servicios/comparacionMacros";
import { Input } from "@/componentes/ui/input";
import { Slider } from "@/componentes/ui/slider";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { aNumero, type DatosFormulario } from "./esquema";

/**
 * Las cuatro metas, en el orden en que se leen en una etiqueta nutricional,
 * con el rango del deslizador de cada una. Fuera del JSX para que agregar una
 * sea tocar la lista y nada más.
 *
 * El tope del deslizador NO es el del esquema (100.000 kcal): es el rango en
 * el que un plan real se mueve, para que arrastrar sea útil. Un valor fuera de
 * ese rango se sigue pudiendo escribir en el campo numérico.
 */
const METAS = [
  {
    nombre: "caloriasMeta",
    tipo: "calorias",
    etiqueta: "Calorías (kcal)",
    maximo: 5000,
    paso: 50,
  },
  {
    nombre: "proteinasMetaG",
    tipo: "proteinasG",
    etiqueta: "Proteínas (g)",
    maximo: 400,
    paso: 5,
  },
  {
    nombre: "carbohidratosMetaG",
    tipo: "carbohidratosG",
    etiqueta: "Carbohidratos (g)",
    maximo: 800,
    paso: 5,
  },
  {
    nombre: "grasasMetaG",
    tipo: "grasasG",
    etiqueta: "Grasas (g)",
    maximo: 300,
    paso: 5,
  },
] as const;

const ETIQUETAS_TIPO: Record<TipoMeta, string> = {
  APROXIMADO: "Aproximada (±10 %)",
  MINIMO: "Como mínimo",
  MAXIMO: "Como máximo",
};

/**
 * Metas diarias de macronutrientes. Todas opcionales, en las dos modalidades.
 *
 * Cada una tiene un deslizador para elegir la cantidad, el número exacto al
 * lado (un deslizador no deja tipear 1850) y CÓMO se lee: aproximada, como
 * mínimo o como máximo. «120 g de proteína como mínimo» se cumple con 150, y
 * es lo que usa la comparación de las combinaciones del día.
 *
 * Llevar el deslizador a cero deja la meta vacía: una meta de 0 kcal no es una
 * meta, y así no queda contra qué comparar.
 */
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
      <div className="grid gap-5 sm:grid-cols-2">
        {METAS.map((meta) => (
          <div key={meta.nombre} className="space-y-2">
            <FormField
              control={control}
              name={meta.nombre}
              render={({ field }) => {
                const valor = aNumero(field.value) ?? 0;
                return (
                  <FormItem className="space-y-2">
                    <div className="flex items-end justify-between gap-2">
                      <FormLabel className="text-xs">{meta.etiqueta}</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          placeholder="Sin meta"
                          className="h-8 w-24 text-right"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <Slider
                      aria-label={`${meta.etiqueta}: deslizador`}
                      min={0}
                      max={meta.maximo}
                      step={meta.paso}
                      value={Math.min(valor, meta.maximo)}
                      onValueChange={(nuevo) =>
                        field.onChange(nuevo === 0 ? "" : String(nuevo))
                      }
                    />
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={control}
              name={`tiposMeta.${meta.tipo}`}
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger
                        className="h-8 text-xs"
                        aria-label={`Tipo de meta de ${meta.etiqueta}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(ETIQUETAS_TIPO) as TipoMeta[]).map(
                        (tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {ETIQUETAS_TIPO[tipo]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

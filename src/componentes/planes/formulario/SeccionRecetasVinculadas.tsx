"use client";

import type { Control } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import { FormField, FormItem, FormMessage } from "@/componentes/ui/form";
import type { DatosFormulario } from "./esquema";

/**
 * Recetas vinculadas directamente al plan, sin franja.
 *
 * Es el único camino para un plan PDF/Word: ese plan no tiene franjas de las
 * que colgar una receta vía `OpcionComida.recetaId` (`SeccionComidas`). Un
 * plan de la app puede usarla también, como agregado —sus recetas "reales"
 * siguen siendo las de cada opción—, así que no se restringe por modalidad.
 */
export function SeccionRecetasVinculadas({
  control,
  recetas,
}: {
  control: Control<DatosFormulario>;
  recetas: { id: string; nombre: string }[];
}) {
  return (
    <FormField
      control={control}
      name="recetaIds"
      render={({ field }) => {
        const seleccionadas = field.value;
        const disponibles = recetas.filter(
          (r) => !seleccionadas.includes(r.id),
        );
        return (
          <FormItem>
            <fieldset className="space-y-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-semibold">
                Recetas vinculadas (opcional)
              </legend>
              <p className="text-sm text-muted-foreground">
                No van atadas a un horario, a diferencia de las de una franja:
                son recetas que acompañan al plan en general.
              </p>

              {seleccionadas.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {seleccionadas.map((id) => {
                    const receta = recetas.find((r) => r.id === id);
                    return (
                      <li key={id}>
                        <Badge variant="secondary" className="gap-1 pr-1">
                          {receta?.nombre ?? "Receta"}
                          <button
                            type="button"
                            aria-label={`Quitar ${receta?.nombre ?? "receta"}`}
                            onClick={() =>
                              field.onChange(
                                seleccionadas.filter((s) => s !== id),
                              )
                            }
                            className="rounded-sm hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex gap-2">
                <Select
                  value=""
                  onValueChange={(id) => field.onChange([...seleccionadas, id])}
                  disabled={disponibles.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        disponibles.length === 0
                          ? "No hay más recetas para agregar"
                          : "Agregar una receta…"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {disponibles.map((receta) => (
                      <SelectItem key={receta.id} value={receta.id}>
                        {receta.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {seleccionadas.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => field.onChange([])}
                  >
                    Vaciar
                  </Button>
                )}
              </div>
              <FormMessage />
            </fieldset>
          </FormItem>
        );
      }}
    />
  );
}

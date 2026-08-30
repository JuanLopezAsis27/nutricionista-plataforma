"use client";

import {
  useFieldArray,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import {
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
import { SIN_RECETA, type DatosFormulario } from "./esquema";

interface Receta {
  id: string;
  nombre: string;
}

/** Una franja nueva arranca con una opción vacía: cero opciones no es válido. */
const COMIDA_VACIA = {
  nombre: "",
  horaDesde: "",
  horaHasta: "",
  opciones: [{ contenido: "", recetaId: SIN_RECETA }],
};

/**
 * Las franjas de comida del día, cada una con sus opciones.
 *
 * Solo aplica a la modalidad APP: un plan en PDF tiene su contenido en el
 * archivo, y ofrecer franjas vacías al lado invitaría a armar dos planes en el
 * mismo registro.
 *
 * Recibe el `form` completo porque necesita `formState.errors` para el error de
 * lista —"agregá al menos una comida"—, que no cuelga de ningún campo.
 */
export function SeccionComidas({
  form,
  recetas,
}: {
  form: UseFormReturn<DatosFormulario>;
  recetas: Receta[];
}) {
  const comidas = useFieldArray({ control: form.control, name: "comidas" });

  // El error de "sin contenido" llega como `.message` (viene del refine del
  // esquema entero) y el de la lista como `.root.message`.
  const errorDeLista =
    form.formState.errors.comidas?.root?.message ??
    form.formState.errors.comidas?.message;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Comidas del día</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => comidas.append(COMIDA_VACIA)}
        >
          <Plus className="h-4 w-4" /> Agregar comida
        </Button>
      </div>

      {errorDeLista && (
        <p className="text-sm text-destructive">{errorDeLista}</p>
      )}

      {comidas.fields.map((comida, indice) => (
        <div key={comida.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-end gap-2">
            <GripVertical className="mb-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <FormField
              control={form.control}
              name={`comidas.${indice}.nombre`}
              render={({ field }) => (
                <FormItem className="min-w-40 flex-1">
                  <FormLabel className="text-xs">Franja</FormLabel>
                  <FormControl>
                    <Input placeholder="Desayuno, Colación…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`comidas.${indice}.horaDesde`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Desde</FormLabel>
                  <FormControl>
                    <Input type="time" className="w-28" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`comidas.${indice}.horaHasta`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Hasta</FormLabel>
                  <FormControl>
                    <Input type="time" className="w-28" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar comida"
              className="mb-0.5"
              disabled={comidas.fields.length === 1}
              onClick={() => comidas.remove(indice)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <OpcionesDeComida
            control={form.control}
            indiceComida={indice}
            recetas={recetas}
          />
        </div>
      ))}
    </div>
  );
}

/** Las opciones intercambiables de UNA franja. */
function OpcionesDeComida({
  control,
  indiceComida,
  recetas,
}: {
  control: Control<DatosFormulario>;
  indiceComida: number;
  recetas: Receta[];
}) {
  const opciones = useFieldArray({
    control,
    name: `comidas.${indiceComida}.opciones`,
  });

  return (
    <div className="space-y-2 pl-6">
      {opciones.fields.map((opcion, indice) => (
        <div
          key={opcion.id}
          className="space-y-2 rounded-md border border-dashed p-3"
        >
          <div className="flex items-start gap-2">
            <span className="mt-2 shrink-0 text-xs font-semibold text-primary">
              Opción {indice + 1}
            </span>
            <FormField
              control={control}
              name={`comidas.${indiceComida}.opciones.${indice}.contenido`}
              render={({ field }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Café con leche descremada + 2 tostadas…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar opción"
              disabled={opciones.fields.length === 1}
              onClick={() => opciones.remove(indice)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          {recetas.length > 0 && (
            <FormField
              control={control}
              name={`comidas.${indiceComida}.opciones.${indice}.recetaId`}
              render={({ field }) => (
                <FormItem className="pl-14">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger
                        className="h-8 w-full text-xs sm:w-72"
                        aria-label="Receta vinculada"
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SIN_RECETA}>
                        Sin receta vinculada
                      </SelectItem>
                      {recetas.map((receta) => (
                        <SelectItem key={receta.id} value={receta.id}>
                          {receta.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => opciones.append({ contenido: "", recetaId: SIN_RECETA })}
      >
        <Plus className="h-4 w-4" /> Agregar opción
      </Button>
    </div>
  );
}

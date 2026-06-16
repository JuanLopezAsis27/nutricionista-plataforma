"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import type { DietaSalidaDto } from "@/aplicacion/dtos/dieta.dto";
import { TIPOS_COMIDA } from "@/dominio/entidades/Dieta";
import { useDietas } from "@/lib/hooks/useDietas";
import { ETIQUETAS_TIPO_COMIDA } from "@/lib/formato";
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

const esquema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  comidas: z
    .array(
      z.object({
        tipo: z.enum(TIPOS_COMIDA),
        descripcion: z.string().min(1, "La descripción es obligatoria"),
        calorias: z.string().optional(),
      }),
    )
    .min(1, "Agregá al menos una comida"),
});
type DatosFormulario = z.infer<typeof esquema>;

interface PropsFormularioDieta {
  dietaInicial?: DietaSalidaDto | null;
  onTerminado: () => void;
}

/** Formulario reutilizable para crear y editar dietas con sus comidas. */
export function FormularioDieta({ dietaInicial, onTerminado }: PropsFormularioDieta) {
  const { crear, actualizar } = useDietas();
  const editando = Boolean(dietaInicial);

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: dietaInicial?.nombre ?? "",
      descripcion: dietaInicial?.descripcion ?? "",
      comidas:
        dietaInicial?.comidas.map((c) => ({
          tipo: c.tipo,
          descripcion: c.descripcion,
          calorias: c.calorias != null ? String(c.calorias) : "",
        })) ?? [{ tipo: "DESAYUNO", descripcion: "", calorias: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "comidas" });
  const enviando = crear.isPending || actualizar.isPending;

  function alEnviar(datos: DatosFormulario) {
    const carga = {
      nombre: datos.nombre,
      descripcion: datos.descripcion?.trim() ? datos.descripcion : null,
      comidas: datos.comidas.map((c) => ({
        tipo: c.tipo,
        descripcion: c.descripcion,
        calorias: c.calorias?.trim() ? Number(c.calorias) : null,
      })),
    };

    if (dietaInicial) {
      actualizar.mutate({ id: dietaInicial.id, ...carga }, { onSuccess: onTerminado });
    } else {
      crear.mutate(carga, { onSuccess: onTerminado });
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
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Comidas</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ tipo: "ALMUERZO", descripcion: "", calorias: "" })}
            >
              <Plus className="h-4 w-4" />
              Agregar comida
            </Button>
          </div>

          {form.formState.errors.comidas?.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.comidas.message}
            </p>
          )}

          {fields.map((campo, indice) => (
            <div
              key={campo.id}
              className="grid grid-cols-[140px_1fr_90px_auto] items-start gap-2 rounded-md border p-2"
            >
              <FormField
                control={form.control}
                name={`comidas.${indice}.tipo`}
                render={({ field }) => (
                  <FormItem>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS_COMIDA.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {ETIQUETAS_TIPO_COMIDA[tipo]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`comidas.${indice}.descripcion`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Descripción" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`comidas.${indice}.calorias`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="number" placeholder="kcal" min={0} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={fields.length <= 1}
                onClick={() => remove(indice)}
                title="Quitar comida"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onTerminado} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear dieta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

"use client";

import type { Control } from "react-hook-form";
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
import { SIN_CARPETA, type DatosFormulario } from "./esquema";

interface Props {
  control: Control<DatosFormulario>;
  grupos: { id: string; nombre: string }[];
}

/** Nombre, descripción y carpeta. Van en las dos modalidades de plan. */
export function SeccionDatosGenerales({ control, grupos }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="nombre"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Nombre del plan</FormLabel>
            <FormControl>
              <Input placeholder="Plan de descenso — fase 1" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="descripcion"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Descripción (opcional)</FormLabel>
            <FormControl>
              <Textarea rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="grupoId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Carpeta</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {/* Estar suelto es una opción, no la ausencia de una: por eso
                    el sentinela y no un value vacío. */}
                <SelectItem value={SIN_CARPETA}>Sin carpeta</SelectItem>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

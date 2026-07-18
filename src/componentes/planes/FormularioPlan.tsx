"use client";

import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { usePlanes } from "@/lib/hooks/usePlanes";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

/** Sentinela para "sin receta" (Radix Select no admite value=""). */
const SIN_RECETA = "__ninguna__";

const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm")
  .or(z.literal(""));

const numeroOpcional = z
  .string()
  .refine((v) => v === "" || Number(v.replace(",", ".")) >= 0, "Debe ser un número positivo");

const esquema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(2000),
  esPlantilla: z.boolean(),
  caloriasMeta: numeroOpcional,
  proteinasMetaG: numeroOpcional,
  carbohidratosMetaG: numeroOpcional,
  grasasMetaG: numeroOpcional,
  contactosUtiles: z.string().max(2000),
  comidas: z
    .array(
      z.object({
        nombre: z.string().min(1, "Nombre obligatorio").max(80),
        horaDesde: hora,
        horaHasta: hora,
        opciones: z
          .array(
            z.object({
              contenido: z.string().min(1, "La opción no puede estar vacía").max(2000),
              recetaId: z.string(),
            }),
          )
          .min(1),
      }),
    )
    .min(1, "El plan debe tener al menos una comida"),
  equivalencias: z.array(
    z.object({
      titulo: z.string().min(1, "Título obligatorio").max(160),
      detalle: z.string().min(1, "Detalle obligatorio").max(1000),
    }),
  ),
  recomendaciones: z.array(
    z.object({
      tipo: z.enum(["NUTRICIONAL", "SALUD"]),
      texto: z.string().min(1, "Texto obligatorio").max(1000),
    }),
  ),
});
type DatosFormulario = z.infer<typeof esquema>;

const FRANJAS_INICIALES: DatosFormulario["comidas"] = [
  { nombre: "Desayuno", horaDesde: "08:00", horaHasta: "09:00", opciones: [{ contenido: "", recetaId: SIN_RECETA }] },
  { nombre: "Almuerzo", horaDesde: "12:30", horaHasta: "13:30", opciones: [{ contenido: "", recetaId: SIN_RECETA }] },
  { nombre: "Merienda", horaDesde: "17:00", horaHasta: "17:30", opciones: [{ contenido: "", recetaId: SIN_RECETA }] },
  { nombre: "Cena", horaDesde: "21:00", horaHasta: "22:00", opciones: [{ contenido: "", recetaId: SIN_RECETA }] },
];

function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const numero = Number(valor.trim().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

interface PropsFormularioPlan {
  planInicial?: PlanSalidaDto | null;
  /** true → el formulario crea una plantilla (solo alta). */
  comoPlantilla?: boolean;
  onTerminado: () => void;
}

/**
 * Editor completo de un plan nutricional: datos generales, metas de macros,
 * franjas con opciones intercambiables (con receta opcional), equivalencias
 * y recomendaciones.
 */
export function FormularioPlan({ planInicial, comoPlantilla, onTerminado }: PropsFormularioPlan) {
  const { crear, actualizar } = usePlanes();
  const { listar: listarRecetas } = useRecetas();
  const recetas = listarRecetas(undefined);
  const enviando = crear.isPending || actualizar.isPending;

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: planInicial
      ? {
          nombre: planInicial.nombre,
          descripcion: planInicial.descripcion ?? "",
          esPlantilla: planInicial.esPlantilla,
          caloriasMeta: planInicial.caloriasMeta?.toString() ?? "",
          proteinasMetaG: planInicial.proteinasMetaG?.toString() ?? "",
          carbohidratosMetaG: planInicial.carbohidratosMetaG?.toString() ?? "",
          grasasMetaG: planInicial.grasasMetaG?.toString() ?? "",
          contactosUtiles: planInicial.contactosUtiles ?? "",
          comidas: planInicial.comidas.map((comida) => ({
            nombre: comida.nombre,
            horaDesde: comida.horaDesde ?? "",
            horaHasta: comida.horaHasta ?? "",
            opciones: comida.opciones.map((opcion) => ({
              contenido: opcion.contenido,
              recetaId: opcion.recetaId ?? SIN_RECETA,
            })),
          })),
          equivalencias: planInicial.equivalencias.map((e) => ({
            titulo: e.titulo,
            detalle: e.detalle,
          })),
          recomendaciones: planInicial.recomendaciones.map((r) => ({
            tipo: r.tipo,
            texto: r.texto,
          })),
        }
      : {
          nombre: "",
          descripcion: "",
          esPlantilla: comoPlantilla ?? false,
          caloriasMeta: "",
          proteinasMetaG: "",
          carbohidratosMetaG: "",
          grasasMetaG: "",
          contactosUtiles: "",
          comidas: FRANJAS_INICIALES,
          equivalencias: [],
          recomendaciones: [],
        },
  });

  const comidas = useFieldArray({ control: form.control, name: "comidas" });
  const equivalencias = useFieldArray({ control: form.control, name: "equivalencias" });
  const recomendaciones = useFieldArray({ control: form.control, name: "recomendaciones" });

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      nombre: datos.nombre,
      descripcion: datos.descripcion.trim() || null,
      caloriasMeta: aNumero(datos.caloriasMeta) != null ? Math.round(aNumero(datos.caloriasMeta)!) : null,
      proteinasMetaG: aNumero(datos.proteinasMetaG),
      carbohidratosMetaG: aNumero(datos.carbohidratosMetaG),
      grasasMetaG: aNumero(datos.grasasMetaG),
      contactosUtiles: datos.contactosUtiles.trim() || null,
      comidas: datos.comidas.map((comida) => ({
        nombre: comida.nombre,
        horaDesde: comida.horaDesde || null,
        horaHasta: comida.horaHasta || null,
        opciones: comida.opciones.map((opcion) => ({
          contenido: opcion.contenido,
          recetaId: opcion.recetaId === SIN_RECETA ? null : opcion.recetaId,
        })),
      })),
      equivalencias: datos.equivalencias,
      recomendaciones: datos.recomendaciones,
    };

    if (planInicial) {
      actualizar.mutate({ id: planInicial.id, ...cuerpo }, { onSuccess: onTerminado });
    } else {
      crear.mutate({ ...cuerpo, esPlantilla: datos.esPlantilla }, { onSuccess: onTerminado });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-6">
        {/* Datos generales */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
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
            control={form.control}
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
        </div>

        {/* Metas de macros */}
        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">Metas diarias (opcionales)</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["caloriasMeta", "Calorías (kcal)"],
                ["proteinasMetaG", "Proteínas (g)"],
                ["carbohidratosMetaG", "Carbohidratos (g)"],
                ["grasasMetaG", "Grasas (g)"],
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

        {/* Franjas de comida */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Comidas del día</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                comidas.append({
                  nombre: "",
                  horaDesde: "",
                  horaHasta: "",
                  opciones: [{ contenido: "", recetaId: SIN_RECETA }],
                })
              }
            >
              <Plus className="h-4 w-4" /> Agregar comida
            </Button>
          </div>
          {form.formState.errors.comidas?.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.comidas.root.message}
            </p>
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
                recetas={(recetas.data ?? []).map((r) => ({ id: r.id, nombre: r.nombre }))}
              />
            </div>
          ))}
        </div>

        {/* Equivalencias */}
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
            <div key={equivalencia.id} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
              <FormField
                control={form.control}
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
                control={form.control}
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

        {/* Recomendaciones */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recomendaciones</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => recomendaciones.append({ tipo: "NUTRICIONAL", texto: "" })}
            >
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
          {recomendaciones.fields.map((recomendacion, indice) => (
            <div key={recomendacion.id} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
              <FormField
                control={form.control}
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
                control={form.control}
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

        {/* Contactos */}
        <FormField
          control={form.control}
          name="contactosUtiles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contactos útiles (aparecen en el PDF)</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Turnos: 351-…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onTerminado} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : planInicial ? "Guardar cambios" : "Crear plan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Opciones intercambiables de una franja (array anidado). */
function OpcionesDeComida({
  control,
  indiceComida,
  recetas,
}: {
  control: Control<DatosFormulario>;
  indiceComida: number;
  recetas: { id: string; nombre: string }[];
}) {
  const opciones = useFieldArray({ control, name: `comidas.${indiceComida}.opciones` });

  return (
    <div className="space-y-2 pl-6">
      {opciones.fields.map((opcion, indice) => (
        <div key={opcion.id} className="space-y-2 rounded-md border border-dashed p-3">
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
                      <SelectTrigger className="h-8 w-full text-xs sm:w-72" aria-label="Receta vinculada">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SIN_RECETA}>Sin receta vinculada</SelectItem>
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

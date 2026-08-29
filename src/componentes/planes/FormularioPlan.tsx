"use client";

import { useState } from "react";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical, FileText, X } from "lucide-react";
import type {
  PlanSalidaDto,
  ArchivoDelPlanDto,
} from "@/aplicacion/dtos/plan.dto";
import {
  MODALIDADES_PLAN,
  type ModalidadPlan,
} from "@/dominio/entidades/PlanNutricional";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { formatearTamano } from "@/lib/formato";
import { numeroEnRango } from "@/lib/validacionListas";
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
/** Ídem para "sin carpeta": estar suelto es una opción, no la ausencia de una. */
const SIN_CARPETA = "__suelto__";

const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm")
  .or(z.literal(""));

/** Esquema del formulario de plan. Exportado para el test de coherencia. */
export const esquema = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio").max(160),
    descripcion: z.string().max(2000),
    esPlantilla: z.boolean(),
    // Los topes son los de planBase en el DTO: sin ellos, un dedazo (12000
    // kcal en vez de 1200) pasaba la pantalla y lo rechazaba el servidor.
    caloriasMeta: numeroEnRango(0, 100_000),
    proteinasMetaG: numeroEnRango(0, 10_000),
    carbohidratosMetaG: numeroEnRango(0, 10_000),
    grasasMetaG: numeroEnRango(0, 10_000),
    contactosUtiles: z.string().max(2000),
    comidas: z.array(
      z.object({
        nombre: z.string().min(1, "Nombre obligatorio").max(80),
        horaDesde: hora,
        horaHasta: hora,
        opciones: z
          .array(
            z.object({
              contenido: z
                .string()
                .min(1, "La opción no puede estar vacía")
                .max(2000),
              recetaId: z.string(),
            }),
          )
          .min(1),
      }),
    ),
    /** APP o PDF. Viene fijada por la pantalla que abrió el formulario. */
    modalidad: z.enum(MODALIDADES_PLAN),
    /** Carpeta donde guardarlo, o el sentinela SIN_CARPETA. */
    grupoId: z.string(),
    /** Id del Archivo que ES el plan (modalidad PDF), o null. */
    archivoPrincipalId: z.string().nullable(),
    equivalencias: z
      .array(
        z.object({
          titulo: z.string().min(1, "Título obligatorio").max(160),
          detalle: z.string().min(1, "Detalle obligatorio").max(1000),
        }),
      )
      .max(100, "Hasta 100 equivalencias"),
    recomendaciones: z
      .array(
        z.object({
          tipo: z.enum(["NUTRICIONAL", "SALUD"]),
          texto: z.string().min(1, "Texto obligatorio").max(1000),
        }),
      )
      .max(100, "Hasta 100 recomendaciones"),
  })
  // Cada modalidad pide su propio contenido. No es "una cosa o la otra" sobre
  // el mismo plan: son dos clases de plan, y el formulario ya sabe cuál está
  // editando.
  .superRefine((d, ctx) => {
    if (d.modalidad === "APP" && d.comidas.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agregá al menos una comida",
        path: ["comidas"],
      });
    }
    if (d.modalidad === "PDF" && !d.archivoPrincipalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Subí el archivo con el plan",
        path: ["archivoPrincipalId"],
      });
    }
  });
type DatosFormulario = z.infer<typeof esquema>;

const FRANJAS_INICIALES: DatosFormulario["comidas"] = [
  {
    nombre: "Desayuno",
    horaDesde: "08:00",
    horaHasta: "09:00",
    opciones: [{ contenido: "", recetaId: SIN_RECETA }],
  },
  {
    nombre: "Almuerzo",
    horaDesde: "12:30",
    horaHasta: "13:30",
    opciones: [{ contenido: "", recetaId: SIN_RECETA }],
  },
  {
    nombre: "Merienda",
    horaDesde: "17:00",
    horaHasta: "17:30",
    opciones: [{ contenido: "", recetaId: SIN_RECETA }],
  },
  {
    nombre: "Cena",
    horaDesde: "21:00",
    horaHasta: "22:00",
    opciones: [{ contenido: "", recetaId: SIN_RECETA }],
  },
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
  /**
   * Qué clase de plan se está dando de alta. En edición manda la del plan: la
   * modalidad no se cambia sobre la marcha —pasar de PDF a APP dejaría un plan
   * sin comidas y al revés tiraría las que ya se cargaron—.
   */
  modalidad?: ModalidadPlan;
  /**
   * Carpeta en la que se está creando (la abierta en la pantalla). Solo aplica
   * al alta: en edición manda la del plan.
   */
  grupoIdInicial?: string | null;
  onTerminado: () => void;
}

/**
 * Editor de un plan nutricional, en sus dos modalidades.
 *
 * En modalidad APP: datos generales, metas, franjas con opciones (con receta
 * opcional), equivalencias y recomendaciones. En modalidad PDF: datos
 * generales, metas y el archivo que ES el plan; no hay franjas que cargar.
 *
 * El material adjunto está en las dos: es material de apoyo del plan, no el
 * plan, y eso vale igual para un plan cargado que para uno subido.
 */
export function FormularioPlan({
  planInicial,
  comoPlantilla,
  modalidad: modalidadProp,
  grupoIdInicial,
  onTerminado,
}: PropsFormularioPlan) {
  const { crear, actualizar, grupos: listarGrupos } = usePlanes();
  const grupos = listarGrupos();
  // La del plan que se edita gana siempre: la modalidad no se cambia editando.
  const modalidad: ModalidadPlan =
    planInicial?.modalidad ?? modalidadProp ?? "APP";
  const esApp = modalidad === "APP";
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
          modalidad: planInicial.modalidad,
          grupoId: planInicial.grupoId ?? SIN_CARPETA,
          archivoPrincipalId: planInicial.archivoPrincipal?.id ?? null,
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
          comidas: modalidad === "APP" ? FRANJAS_INICIALES : [],
          equivalencias: [],
          recomendaciones: [],
          modalidad,
          grupoId: grupoIdInicial ?? SIN_CARPETA,
          archivoPrincipalId: null,
        },
  });

  // Fichas de los archivos, para mostrar nombre y tamaño. Van en estado y no en
  // el formulario porque no se validan: lo único que se valida es que en un
  // plan PDF haya principal, y eso es `archivoPrincipalId`.
  const [principal, setPrincipal] = useState<ArchivoDelPlanDto | null>(
    planInicial?.archivoPrincipal ?? null,
  );
  const [adjuntos, setAdjuntos] = useState<ArchivoDelPlanDto[]>(
    planInicial?.adjuntos ?? [],
  );

  const comidas = useFieldArray({ control: form.control, name: "comidas" });
  const equivalencias = useFieldArray({
    control: form.control,
    name: "equivalencias",
  });
  const recomendaciones = useFieldArray({
    control: form.control,
    name: "recomendaciones",
  });

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      nombre: datos.nombre,
      descripcion: datos.descripcion.trim() || null,
      caloriasMeta:
        aNumero(datos.caloriasMeta) != null
          ? Math.round(aNumero(datos.caloriasMeta)!)
          : null,
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
      modalidad: datos.modalidad,
      grupoId: datos.grupoId === SIN_CARPETA ? null : datos.grupoId,
      archivoPrincipalId: datos.archivoPrincipalId,
      // El principal también va en la lista: ser el plan no lo exime de estar
      // vinculado a él. Lo que no esté acá el servidor lo desvincula.
      archivoIds: [
        ...(datos.archivoPrincipalId ? [datos.archivoPrincipalId] : []),
        ...adjuntos.map((a) => a.id),
      ],
    };

    if (planInicial) {
      actualizar.mutate(
        { id: planInicial.id, ...cuerpo },
        { onSuccess: onTerminado },
      );
    } else {
      crear.mutate(
        { ...cuerpo, esPlantilla: datos.esPlantilla },
        { onSuccess: onTerminado },
      );
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
          <FormField
            control={form.control}
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
                    <SelectItem value={SIN_CARPETA}>Sin carpeta</SelectItem>
                    {(grupos.data ?? []).map((grupo) => (
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

        {/* Metas de macros */}
        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">
            Metas diarias (opcionales)
          </legend>
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

        {/* El archivo que ES el plan (solo modalidad PDF) */}
        {!esApp && (
          <FormField
            control={form.control}
            name="archivoPrincipalId"
            render={() => (
              <FormItem>
                <fieldset className="space-y-3 rounded-lg border p-4">
                  <legend className="px-1 text-sm font-semibold">
                    El plan (PDF)
                  </legend>
                  <p className="text-sm text-muted-foreground">
                    Este archivo ES el plan: es lo que el paciente ve al entrar
                    a «Mi plan».
                  </p>
                  {principal ? (
                    <FilaArchivo
                      archivo={principal}
                      etiquetaQuitar="Quitar el archivo del plan"
                      onQuitar={() => {
                        setPrincipal(null);
                        form.setValue("archivoPrincipalId", null, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  ) : (
                    <SubidorArchivo
                      contexto="plan"
                      accept="application/pdf"
                      onSubido={(archivo) => {
                        setPrincipal(aFichaArchivo(archivo));
                        form.setValue("archivoPrincipalId", archivo.id, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  )}
                  <FormMessage />
                </fieldset>
              </FormItem>
            )}
          />
        )}

        {/* Material adjunto: en las dos modalidades. No reemplaza al plan. */}
        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">
            Material adjunto (opcional)
          </legend>
          <p className="text-sm text-muted-foreground">
            {esApp
              ? "PDFs que acompañan al plan: la lista de compras, un instructivo, un recetario. El paciente los ve al final de su plan."
              : "PDFs que acompañan al plan principal. El paciente los ve debajo del plan."}
          </p>

          {adjuntos.length > 0 && (
            <ul className="space-y-2">
              {adjuntos.map((adjunto) => (
                <li key={adjunto.id}>
                  <FilaArchivo
                    archivo={adjunto}
                    etiquetaQuitar={`Quitar ${adjunto.nombreOriginal}`}
                    onQuitar={() =>
                      setAdjuntos((previos) =>
                        previos.filter((a) => a.id !== adjunto.id),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <SubidorArchivo
            contexto="plan"
            accept="application/pdf"
            onSubido={(archivo) =>
              setAdjuntos((previos) => [...previos, aFichaArchivo(archivo)])
            }
          />
        </fieldset>

        {/* Contenido del plan cargado en la app. Un plan en PDF no lo tiene:
            su contenido es el archivo, y ofrecer franjas vacías al lado
            invitaría a armar dos planes en el mismo registro. */}
        {esApp && (
          <>
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
              {/* El error de "sin contenido" llega como `.message` (viene del refine
                del esquema entero) y el de la lista como `.root.message`. */}
              {(form.formState.errors.comidas?.root?.message ??
                form.formState.errors.comidas?.message) && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.comidas?.root?.message ??
                    form.formState.errors.comidas?.message}
                </p>
              )}

              {comidas.fields.map((comida, indice) => (
                <div
                  key={comida.id}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <GripVertical className="mb-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <FormField
                      control={form.control}
                      name={`comidas.${indice}.nombre`}
                      render={({ field }) => (
                        <FormItem className="min-w-40 flex-1">
                          <FormLabel className="text-xs">Franja</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Desayuno, Colación…"
                              {...field}
                            />
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
                    recetas={(recetas.data ?? []).map((r) => ({
                      id: r.id,
                      nombre: r.nombre,
                    }))}
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
                  onClick={() =>
                    equivalencias.append({ titulo: "", detalle: "" })
                  }
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
                          <Input
                            placeholder="1 manzana o 1 banana chica"
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
                    control={form.control}
                    name={`recomendaciones.${indice}.tipo`}
                    render={({ field }) => (
                      <FormItem className="w-full sm:w-44">
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger aria-label="Tipo de recomendación">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NUTRICIONAL">
                              Nutricional
                            </SelectItem>
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
                          <Input
                            placeholder="Tomar 2 L de agua por día"
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
                    aria-label="Quitar recomendación"
                    onClick={() => recomendaciones.remove(indice)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

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
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando
              ? "Guardando…"
              : planInicial
                ? "Guardar cambios"
                : "Crear plan"}
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

/** Ficha mínima del archivo recién subido, para mostrarlo sin recargar el plan. */
function aFichaArchivo(archivo: {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
}): ArchivoDelPlanDto {
  return {
    id: archivo.id,
    nombreOriginal: archivo.nombreOriginal,
    mimeType: archivo.mimeType,
    tamanoBytes: archivo.tamanoBytes,
  };
}

/** Fila de un archivo ya vinculado, con el botón de quitarlo. */
function FilaArchivo({
  archivo,
  etiquetaQuitar,
  onQuitar,
}: {
  archivo: ArchivoDelPlanDto;
  etiquetaQuitar: string;
  onQuitar: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm">
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{archivo.nombreOriginal}</p>
        <p className="text-xs text-muted-foreground">
          {formatearTamano(archivo.tamanoBytes)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={etiquetaQuitar}
        onClick={onQuitar}
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

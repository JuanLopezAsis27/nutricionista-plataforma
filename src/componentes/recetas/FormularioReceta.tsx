"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, FileText, LinkIcon, X, Plus, Star } from "lucide-react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import type { AlimentoNutricionalSalidaDto } from "@/aplicacion/dtos/nutricion.dto";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
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
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { AdjuntosGuardados } from "@/componentes/recetas/AdjuntosGuardados";
import { partirEtiquetas, partirEnlaces } from "@/lib/validacionListas";
import { cn } from "@/lib/utilidades";
import {
  esquema,
  INGREDIENTE_VACIO,
  type DatosFormulario,
} from "./formulario/esquema";
import {
  aNumero,
  calcularTotales,
  porPorcion,
  hayMacros,
} from "@/componentes/comunes/alimentos/macros";
import { TotalItem } from "./formulario/TotalItem";
import { FilaIngrediente } from "./formulario/FilaIngrediente";
import { BuscadorAlimento } from "@/componentes/comunes/alimentos/BuscadorAlimento";

// El esquema se reexporta porque `coherencia-formularios-2.test.ts` lo importa
// desde acá, que sigue siendo el punto de entrada del formulario.
export { esquema } from "./formulario/esquema";

interface PropsFormularioReceta {
  recetaInicial?: RecetaSalidaDto | null;
  /**
   * Carpeta en la que se está creando (la abierta en la pantalla). Solo aplica
   * al alta: en edición manda la de la receta, y no mandar el campo la deja
   * donde está.
   */
  grupoIdInicial?: string | null;
  onTerminado: () => void;
}

/**
 * Alta/edición de una receta: ingredientes estructurados (con búsqueda de datos
 * nutricionales en Open Food Facts y suma automática de macros), preparación,
 * etiquetas y fotos.
 */
export function FormularioReceta({
  recetaInicial,
  grupoIdInicial,
  onTerminado,
}: PropsFormularioReceta) {
  const { crear, actualizar } = useRecetas();
  const enviando = crear.isPending || actualizar.isPending;

  const [fotosNuevas, setFotosNuevas] = useState<ArchivoSalidaDto[]>([]);
  /**
   * Portada elegida entre las fotos recién subidas, que todavía no existen
   * para el servidor: viaja con el guardado. La portada entre las fotos YA
   * guardadas se cambia en el acto desde `AdjuntosGuardados`, que es otra
   * cosa —ahí la foto existe y la mutación es inmediata—.
   */
  const [portadaNuevaId, setPortadaNuevaId] = useState<string | null>(null);
  const [documentosNuevos, setDocumentosNuevos] = useState<ArchivoSalidaDto[]>(
    [],
  );

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: recetaInicial?.nombre ?? "",
      descripcion: recetaInicial?.descripcion ?? "",
      porciones: recetaInicial?.porciones?.toString() ?? "",
      ingredientes: (recetaInicial?.ingredientes ?? []).map((ing) => ({
        nombre: ing.nombre,
        cantidadGramos: ing.cantidadGramos?.toString() ?? "",
        caloriasPor100: ing.caloriasPor100?.toString() ?? "",
        proteinasPor100: ing.proteinasPor100?.toString() ?? "",
        carbohidratosPor100: ing.carbohidratosPor100?.toString() ?? "",
        grasasPor100: ing.grasasPor100?.toString() ?? "",
        fuente: ing.fuente ?? "MANUAL",
        referenciaExterna: ing.referenciaExterna ?? "",
      })),
      preparacion: recetaInicial?.preparacion ?? "",
      etiquetas: (recetaInicial?.etiquetas ?? []).join(", "),
      enlaces: (recetaInicial?.enlaces ?? []).join("\n"),
      calorias: recetaInicial?.calorias?.toString() ?? "",
      proteinasG: recetaInicial?.proteinasG?.toString() ?? "",
      carbohidratosG: recetaInicial?.carbohidratosG?.toString() ?? "",
      grasasG: recetaInicial?.grasasG?.toString() ?? "",
    },
  });

  const ingredientes = useFieldArray({
    control: form.control,
    name: "ingredientes",
  });

  // Totales en vivo desde lo que hay cargado.
  const ingredientesActuales = form.watch("ingredientes");
  const porcionesActuales = aNumero(form.watch("porciones"));
  const totales = calcularTotales(ingredientesActuales ?? []);
  const totalesCalculados = hayMacros(totales);
  const totalesPorcion = porPorcion(totales, porcionesActuales);

  function elegirAlimento(alimento: AlimentoNutricionalSalidaDto) {
    ingredientes.append({
      nombre: alimento.marca
        ? `${alimento.nombre} (${alimento.marca})`
        : alimento.nombre,
      cantidadGramos: "100",
      caloriasPor100: alimento.caloriasPor100?.toString() ?? "",
      proteinasPor100: alimento.proteinasPor100?.toString() ?? "",
      carbohidratosPor100: alimento.carbohidratosPor100?.toString() ?? "",
      grasasPor100: alimento.grasasPor100?.toString() ?? "",
      fuente: alimento.fuente,
      referenciaExterna: alimento.referenciaExterna ?? "",
    });
  }

  function alEnviar(datos: DatosFormulario) {
    const porciones = aNumero(datos.porciones);
    const cuerpo = {
      nombre: datos.nombre,
      descripcion: datos.descripcion.trim() || null,
      porciones: porciones != null ? Math.round(porciones) : null,
      preparacion: datos.preparacion.trim() || null,
      ingredientes: datos.ingredientes
        .filter((ing) => ing.nombre.trim() !== "")
        .map((ing) => ({
          nombre: ing.nombre.trim(),
          cantidadGramos: aNumero(ing.cantidadGramos),
          caloriasPor100: aNumero(ing.caloriasPor100),
          proteinasPor100: aNumero(ing.proteinasPor100),
          carbohidratosPor100: aNumero(ing.carbohidratosPor100),
          grasasPor100: aNumero(ing.grasasPor100),
          fuente: ing.fuente.trim() || null,
          referenciaExterna: ing.referenciaExterna.trim() || null,
        })),
      // Los mismos helpers que usa el esquema: si el corte cambiara solo acá,
      // la validación estaría mirando una lista distinta de la que se envía.
      etiquetas: partirEtiquetas(datos.etiquetas),
      enlaces: partirEnlaces(datos.enlaces),
      // Fallback manual (se usa solo si ningún ingrediente trae macros).
      calorias:
        aNumero(datos.calorias) != null
          ? Math.round(aNumero(datos.calorias)!)
          : null,
      proteinasG: aNumero(datos.proteinasG),
      carbohidratosG: aNumero(datos.carbohidratosG),
      grasasG: aNumero(datos.grasasG),
    };
    const fotoIds = fotosNuevas.map((foto) => foto.id);
    const documentoIds = documentosNuevos.map((doc) => doc.id);
    // `undefined` y no `null`: no elegir portada deja la que hubiera, y en una
    // receta nueva deja el automático (la primera foto).
    const fotoPrincipalId = portadaNuevaId ?? undefined;

    if (recetaInicial) {
      actualizar.mutate(
        {
          id: recetaInicial.id,
          ...cuerpo,
          fotoIdsNuevos: fotoIds,
          documentoIdsNuevos: documentoIds,
          fotoPrincipalId,
        },
        { onSuccess: onTerminado },
      );
    } else {
      crear.mutate(
        {
          ...cuerpo,
          fotoIds,
          documentoIds,
          fotoPrincipalId,
          // La receta nueva nace en la carpeta abierta: crear algo "adentro"
          // de una carpeta y que aparezca afuera es el error obvio de este
          // flujo.
          grupoId: grupoIdInicial ?? null,
        },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Tortilla de espinaca" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="porciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Porciones</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="—" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ingredientes con datos nutricionales */}
        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">Ingredientes</legend>

          <BuscadorAlimento onElegir={elegirAlimento} />

          {ingredientes.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Buscá un alimento arriba para agregarlo con sus macros, o cargá
              uno a mano.
            </p>
          )}

          <div className="space-y-2">
            {ingredientes.fields.map((campo, indice) => (
              <FilaIngrediente
                key={campo.id}
                form={form}
                indice={indice}
                onQuitar={() => ingredientes.remove(indice)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ingredientes.append({ ...INGREDIENTE_VACIO })}
          >
            <Plus className="h-4 w-4" /> Agregar ingrediente a mano
          </Button>

          {/* Totales calculados */}
          {totalesCalculados && (
            <div className="rounded-md bg-muted/60 p-3 text-sm">
              <p className="mb-1 font-semibold">Totales calculados</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <TotalItem etiqueta="Receta" macros={totales} />
                {porcionesActuales != null && porcionesActuales > 1 && (
                  <TotalItem etiqueta="Por porción" macros={totalesPorcion} />
                )}
              </div>
            </div>
          )}
        </fieldset>

        <FormField
          control={form.control}
          name="preparacion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preparación</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Pasos de la preparación…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Macros manuales (fallback si no se cargan ingredientes con datos) */}
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Macros por porción a mano (opcional)
          </summary>
          <p className="mt-1 text-xs text-muted-foreground">
            Se usan solo si la receta no tiene ingredientes con datos
            nutricionales. Si los tiene, los macros se calculan automáticamente.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["calorias", "Calorías"],
                ["proteinasG", "Proteínas (g)"],
                ["carbohidratosG", "Carbohidratos (g)"],
                ["grasasG", "Grasas (g)"],
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
        </details>

        <FormField
          control={form.control}
          name="etiquetas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiquetas (separadas por coma)</FormLabel>
              <FormControl>
                <Input
                  placeholder="vegetariano, sin TACC, alta proteína"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Adjuntos ya guardados: se borran y se elige la portada en el acto,
            sin pasar por "Guardar". */}
        {recetaInicial && <AdjuntosGuardados recetaId={recetaInicial.id} />}

        {/* Fotos nuevas */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ImagePlus className="h-4 w-4" /> Agregar fotos
          </p>
          {fotosNuevas.length > 0 && (
            <>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {fotosNuevas.map((foto) => {
                  const esPortada = portadaNuevaId === foto.id;
                  return (
                    <li
                      key={foto.id}
                      className={cn(
                        "overflow-hidden rounded-md border",
                        esPortada && "ring-2 ring-primary",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- ruta dinámica autorizada, no optimizable */}
                      <img
                        src={`/api/archivos/${foto.id}/ver`}
                        alt={foto.nombreOriginal}
                        className="h-24 w-full object-cover"
                      />
                      <div className="flex items-center justify-between gap-1 p-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          aria-pressed={esPortada}
                          title={
                            esPortada
                              ? "Es la portada elegida"
                              : "Usar como portada"
                          }
                          onClick={() =>
                            setPortadaNuevaId(esPortada ? null : foto.id)
                          }
                        >
                          <Star
                            className={cn(
                              "h-3.5 w-3.5",
                              esPortada && "fill-current",
                            )}
                          />
                          {esPortada ? "Portada" : "Usar"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Quitar ${foto.nombreOriginal}`}
                          onClick={() => {
                            setFotosNuevas((previas) =>
                              previas.filter((f) => f.id !== foto.id),
                            );
                            // Si se quita la elegida, la portada vuelve al
                            // automático: mandar el id de una foto que ya no se
                            // vincula hace fallar el guardado entero.
                            setPortadaNuevaId((actual) =>
                              actual === foto.id ? null : actual,
                            );
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                La marcada con la estrella se guarda como portada del recetario.
              </p>
            </>
          )}
          <SubidorArchivo
            contexto="receta"
            accept="image/*"
            // La lista de arriba ya muestra cada foto subida; con la vista
            // previa del subidor aparecía dos veces.
            sinVistaPrevia
            onSubido={(archivo) =>
              setFotosNuevas((previas) => [...previas, archivo])
            }
          />
        </div>

        {/* Documentos nuevos (PDF/Word) */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <FileText className="h-4 w-4" /> Agregar documentos
          </p>
          {documentosNuevos.length > 0 && (
            <ul className="space-y-1">
              {documentosNuevos.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="truncate">{doc.nombreOriginal}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar documento"
                    onClick={() =>
                      setDocumentosNuevos((previos) =>
                        previos.filter((d) => d.id !== doc.id),
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <SubidorArchivo
            contexto="receta"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            sinVistaPrevia
            onSubido={(archivo) =>
              setDocumentosNuevos((previos) => [...previos, archivo])
            }
          />
        </div>

        {/* Enlaces de referencia */}
        <FormField
          control={form.control}
          name="enlaces"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4" /> Enlaces de referencia (uno por
                línea)
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="https://youtube.com/…&#10;https://blog-de-cocina.com/receta"
                  {...field}
                />
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
              : recetaInicial
                ? "Guardar cambios"
                : "Crear receta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Muestra un grupo de macros como texto compacto. */

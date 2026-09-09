"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ETIQUETA_DIA, type DiaSemana } from "@/dominio/entidades/PlanSemanal";
import type { PlanSemanalSalidaDto } from "@/aplicacion/dtos/planSemanal.dto";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
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
import type { Macros } from "@/componentes/comunes/alimentos/macros";
import {
  esquema,
  aNumero,
  comidaVacia,
  tieneContenido,
  FRANJAS_INICIALES,
  SIN_RECETA,
  type ComidaFormulario,
  type DatosFormulario,
} from "./formulario/esquema";
import { totalesPorDia } from "./formulario/totales";
import { GrillaSemana } from "./formulario/GrillaSemana";
import { EditorComida } from "./formulario/EditorComida";

// El esquema se reexporta como en el formulario de plan: es el punto de
// entrada del formulario y lo que importa el test de coherencia con el DTO.
export { esquema } from "./formulario/esquema";

/** Qué celda está abierta en el editor. `indiceComida` null = una nueva. */
interface CeldaEnEdicion {
  indiceFranja: number;
  dia: DiaSemana;
  indiceComida: number | null;
}

interface Props {
  planInicial?: PlanSemanalSalidaDto | null;
  onTerminado: () => void;
}

/**
 * Editor de un plan semanal: los datos generales, las franjas (las filas) y la
 * grilla de siete días con sus comidas y alternativas.
 *
 * ## Por qué las comidas no son un `useFieldArray`
 *
 * Las franjas sí lo son —se agregan y se borran con el formulario a la vista—,
 * pero las comidas de una celda se editan en un DIÁLOGO: mientras está
 * abierto, lo que se escribe todavía no es parte del plan y cancelar tiene que
 * dejarlo como estaba. Por eso el borrador vive en el editor y sube por
 * `setValue` recién al guardar.
 *
 * ## El orden dentro de la celda importa
 *
 * La primera comida de cada celda es la PRINCIPAL: es la que suma al total del
 * día, y las demás son alternativas suyas. «Hacer principal» reordena el array
 * poniéndola primera entre las de su día; el total de la columna se mueve solo.
 */
export function FormularioPlanSemanal({ planInicial, onTerminado }: Props) {
  const { crear, actualizar } = usePlanesSemanales();
  const { listar: listarRecetas } = useRecetas();
  const recetas = listarRecetas(undefined);
  const enviando = crear.isPending || actualizar.isPending;
  const [celda, setCelda] = useState<CeldaEnEdicion | null>(null);
  // Plegadas por defecto: las seis franjas iniciales cubren el caso típico y
  // el alto que ocupaban lo necesita la grilla para entrar entera.
  const [franjasAbiertas, setFranjasAbiertas] = useState(false);

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: planInicial
      ? {
          nombre: planInicial.nombre,
          descripcion: planInicial.descripcion ?? "",
          franjas: planInicial.franjas.map((franja) => ({
            nombre: franja.nombre,
            horaDesde: franja.horaDesde ?? "",
            horaHasta: franja.horaHasta ?? "",
            comidas: franja.comidas.map((comida) => ({
              dia: comida.dia,
              descripcion: comida.descripcion ?? "",
              recetaId: comida.recetaId ?? SIN_RECETA,
              porciones: comida.porciones?.toString() ?? "",
              items: comida.items.map((item) => ({
                nombre: item.nombre,
                cantidadGramos: item.cantidadGramos?.toString() ?? "",
                caloriasPor100: item.caloriasPor100?.toString() ?? "",
                proteinasPor100: item.proteinasPor100?.toString() ?? "",
                carbohidratosPor100: item.carbohidratosPor100?.toString() ?? "",
                grasasPor100: item.grasasPor100?.toString() ?? "",
                fuente: item.fuente ?? "MANUAL",
                referenciaExterna: item.referenciaExterna ?? "",
              })),
            })),
          })),
        }
      : { nombre: "", descripcion: "", franjas: FRANJAS_INICIALES },
  });

  const franjas = useFieldArray({ control: form.control, name: "franjas" });
  // `watch` y no `franjas.fields`: los campos del array no se actualizan con
  // los `setValue` de las comidas, y la grilla tiene que redibujarse con ellos.
  const valores = form.watch("franjas");

  /** Macros POR PORCIÓN de cada receta, para sumarlas en las comidas. */
  const macrosDeRecetas = useMemo(() => {
    const mapa = new Map<string, Macros>();
    for (const receta of recetas.data ?? []) {
      mapa.set(receta.id, {
        calorias: receta.calorias,
        proteinasG: receta.proteinasG,
        carbohidratosG: receta.carbohidratosG,
        grasasG: receta.grasasG,
      });
    }
    return mapa;
  }, [recetas.data]);

  const totales = totalesPorDia(valores ?? [], macrosDeRecetas);

  function comidasDe(indiceFranja: number): ComidaFormulario[] {
    return form.getValues(`franjas.${indiceFranja}.comidas`) ?? [];
  }

  function guardarComidas(
    indiceFranja: number,
    comidas: ComidaFormulario[],
  ): void {
    form.setValue(`franjas.${indiceFranja}.comidas`, comidas, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function guardarComida(comida: ComidaFormulario) {
    if (!celda) return;
    const comidas = [...comidasDe(celda.indiceFranja)];
    if (celda.indiceComida == null) {
      comidas.push(comida);
    } else {
      comidas[celda.indiceComida] = comida;
    }
    guardarComidas(celda.indiceFranja, comidas);
    setCelda(null);
  }

  function quitarComida(indiceFranja: number, indiceComida: number) {
    guardarComidas(
      indiceFranja,
      comidasDe(indiceFranja).filter((_, i) => i !== indiceComida),
    );
  }

  /**
   * Pone esa comida primera ENTRE LAS DE SU DÍA: es lo que la vuelve la que
   * suma al total. No se mueve al principio del array porque el array lleva
   * los siete días mezclados.
   */
  function hacerPrincipal(indiceFranja: number, indiceComida: number) {
    const comidas = comidasDe(indiceFranja);
    const elegida = comidas[indiceComida];
    if (!elegida) return;
    const primeraDelDia = comidas.findIndex((c) => c.dia === elegida.dia);
    const resto = comidas.filter((_, i) => i !== indiceComida);
    const destino = primeraDelDia === -1 ? resto.length : primeraDelDia;
    guardarComidas(indiceFranja, [
      ...resto.slice(0, destino),
      elegida,
      ...resto.slice(destino),
    ]);
  }

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      nombre: datos.nombre,
      descripcion: datos.descripcion.trim() || null,
      franjas: datos.franjas.map((franja) => ({
        nombre: franja.nombre,
        horaDesde: franja.horaDesde || null,
        horaHasta: franja.horaHasta || null,
        // Las celdas vacías no viajan: son los huecos del menú, no comidas.
        comidas: franja.comidas.filter(tieneContenido).map((comida) => ({
          dia: comida.dia,
          descripcion: comida.descripcion.trim() || null,
          recetaId: comida.recetaId === SIN_RECETA ? null : comida.recetaId,
          porciones:
            comida.recetaId === SIN_RECETA
              ? null
              : (aNumero(comida.porciones) ?? 1),
          items: comida.items
            .filter((item) => item.nombre.trim() !== "")
            .map((item) => ({
              nombre: item.nombre.trim(),
              cantidadGramos: aNumero(item.cantidadGramos),
              caloriasPor100: aNumero(item.caloriasPor100),
              proteinasPor100: aNumero(item.proteinasPor100),
              carbohidratosPor100: aNumero(item.carbohidratosPor100),
              grasasPor100: aNumero(item.grasasPor100),
              fuente: item.fuente || null,
              referenciaExterna: item.referenciaExterna || null,
            })),
        })),
      })),
    };

    if (planInicial) {
      actualizar.mutate(
        { id: planInicial.id, ...cuerpo },
        { onSuccess: onTerminado },
      );
    } else {
      crear.mutate(cuerpo, { onSuccess: onTerminado });
    }
  }

  const comidaEnEdicion =
    celda && celda.indiceComida != null
      ? (comidasDe(celda.indiceFranja)[celda.indiceComida] ?? null)
      : null;

  return (
    <Form {...form}>
      {/* El formulario fluye y el diálogo lo scrollea: la grilla ocupa lo que
          necesite. Repartir el alto de la ventana entre las secciones dejaba la
          semana en una franja mínima en cuanto la pantalla era baja. */}
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Semana tipo — descenso" {...field} />
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
                <FormLabel>Descripción (opcional)</FormLabel>
                <FormControl>
                  <Textarea rows={1} placeholder="Para qué sirve" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Las franjas se editan poco —se eligen una vez y quedan— así que van
            plegadas: el alto que ocupaban es el que necesita la grilla para
            mostrar la semana entera sin scrollear. */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex min-w-0 items-baseline gap-2 text-sm font-medium">
              Franjas
              <span className="line-clamp-1 text-xs font-normal text-muted-foreground">
                {(valores ?? [])
                  .map((franja) => franja.nombre)
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </h3>
            <div className="flex shrink-0 gap-2">
              {franjasAbiertas && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    franjas.append({
                      nombre: "",
                      horaDesde: "",
                      horaHasta: "",
                      comidas: [],
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Agregar franja
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFranjasAbiertas((abierto) => !abierto)}
              >
                {franjasAbiertas ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {franjasAbiertas ? "Listo" : "Editar franjas"}
              </Button>
            </div>
          </div>
          <div
            className="max-h-36 space-y-2 overflow-y-auto pr-1"
            hidden={!franjasAbiertas}
          >
            {franjas.fields.map((campo, indice) => (
              <div key={campo.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`franjas.${indice}.nombre`}
                  render={({ field }) => (
                    <FormItem className="min-w-0 flex-1">
                      <FormControl>
                        <Input placeholder="Desayuno" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`franjas.${indice}.horaDesde`}
                  render={({ field }) => (
                    <FormItem className="w-28 shrink-0">
                      <FormControl>
                        <Input type="time" aria-label="Hora desde" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`franjas.${indice}.horaHasta`}
                  render={({ field }) => (
                    <FormItem className="w-28 shrink-0">
                      <FormControl>
                        <Input type="time" aria-label="Hora hasta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Quitar franja"
                  title="Quitar franja (con sus comidas)"
                  onClick={() => franjas.remove(indice)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          {form.formState.errors.franjas?.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.franjas.message}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Menú de la semana</h3>
          <div className="rounded-md border p-2">
            <GrillaSemana
              franjas={valores ?? []}
              recetas={(recetas.data ?? []).map((r) => ({
                id: r.id,
                nombre: r.nombre,
              }))}
              macrosDeRecetas={macrosDeRecetas}
              totales={totales}
              onAgregar={(indiceFranja, dia) =>
                setCelda({ indiceFranja, dia, indiceComida: null })
              }
              onEditar={(indiceFranja, indiceComida) => {
                const comida = comidasDe(indiceFranja)[indiceComida];
                if (!comida) return;
                setCelda({ indiceFranja, dia: comida.dia, indiceComida });
              }}
              onQuitar={quitarComida}
              onHacerPrincipal={hacerPrincipal}
            />
          </div>
        </section>

        <div className="flex justify-end gap-2 border-t pt-3">
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
                : "Crear plan semanal"}
          </Button>
        </div>
      </form>

      {celda && (
        <EditorComida
          // Una instancia por celda: el editor toma su borrador de las props
          // al montarse, así que cambiar de celda tiene que remontarlo.
          key={`${celda.indiceFranja}-${celda.dia}-${celda.indiceComida ?? "nueva"}`}
          abierto
          franja={
            form.getValues(`franjas.${celda.indiceFranja}.nombre`) || "Franja"
          }
          dia={celda.dia}
          etiquetaDia={ETIQUETA_DIA[celda.dia]}
          comida={comidaEnEdicion ?? comidaVacia(celda.dia)}
          recetas={(recetas.data ?? []).map((r) => ({
            id: r.id,
            nombre: r.nombre,
          }))}
          macrosDeRecetas={macrosDeRecetas}
          onGuardar={guardarComida}
          onQuitar={
            celda.indiceComida != null
              ? () => {
                  quitarComida(celda.indiceFranja, celda.indiceComida!);
                  setCelda(null);
                }
              : undefined
          }
          onCerrar={() => setCelda(null)}
        />
      )}
    </Form>
  );
}

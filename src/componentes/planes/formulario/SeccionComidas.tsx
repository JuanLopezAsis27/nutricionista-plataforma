"use client";

import {
  useFieldArray,
  useWatch,
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
import { BuscadorAlimento } from "@/componentes/comunes/alimentos/BuscadorAlimento";
import {
  calcularTotales,
  escalarMacros,
  sumarMacros,
  hayMacros,
  type Macros,
} from "@/componentes/comunes/alimentos/macros";
import {
  BuscadorReceta,
  type RecetaParaElegir,
} from "@/componentes/recetas/BuscadorReceta";
import {
  SIN_RECETA,
  aNumero,
  opcionVacia,
  type DatosFormulario,
  type ItemOpcionFormulario,
} from "./esquema";

/** Una receta del recetario que se puede elegir en una opción. */
export type RecetaElegible = RecetaParaElegir;

/** Una franja nueva arranca con una opción vacía: cero opciones no es válido. */
const COMIDA_VACIA = {
  nombre: "",
  horaDesde: "",
  horaHasta: "",
  opciones: [opcionVacia()],
};

/**
 * Las franjas de comida del día, cada una con sus opciones.
 *
 * Solo aplica a la modalidad APP: un plan en PDF tiene su contenido en el
 * archivo, y ofrecer franjas vacías al lado invitaría a armar dos planes en el
 * mismo registro.
 *
 * Cada opción se describe con cualquier combinación de tres cosas, y las tres
 * conviven a propósito (migración 82):
 *
 *  - **texto**, que es lo que el paciente lee;
 *  - **una receta** del recetario, con sus porciones —aporta sus macros por
 *    porción, que ya salen de SUS ingredientes—;
 *  - **alimentos sueltos** del buscador, con gramos y macros por 100 g.
 *
 * Receta y alimentos se suman; los ingredientes de la receta NO se suman
 * aparte (sería contarla dos veces). Un alimento suelto que también esté en la
 * receta sí suma: es comida de más, y el panel de combinaciones lo avisa por
 * si fue un error.
 *
 * Recibe el `form` completo porque necesita `formState.errors` para el error de
 * lista —"agregá al menos una comida"—, que no cuelga de ningún campo.
 */
export function SeccionComidas({
  form,
  recetas,
}: {
  form: UseFormReturn<DatosFormulario>;
  recetas: RecetaElegible[];
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
        <div key={comida.id} className="space-y-3 rounded-lg border p-3 sm:p-4">
          {/* En el celular: el nombre con el botón de quitar arriba y las dos
              horas debajo, a lo ancho. En pantallas grandes, todo en una fila. */}
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:flex sm:flex-wrap">
            <GripVertical className="mb-2.5 hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
            <FormField
              control={form.control}
              name={`comidas.${indice}.nombre`}
              render={({ field }) => (
                <FormItem className="col-span-2 min-w-0 sm:min-w-40 sm:flex-1">
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
                <FormItem className="sm:order-2">
                  <FormLabel className="text-xs">Desde</FormLabel>
                  <FormControl>
                    <Input type="time" className="w-full sm:w-28" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`comidas.${indice}.horaHasta`}
              render={({ field }) => (
                <FormItem className="sm:order-3">
                  <FormLabel className="text-xs">Hasta</FormLabel>
                  <FormControl>
                    <Input type="time" className="w-full sm:w-28" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar comida"
              // En la grilla del celular queda en la fila del nombre (columna
              // 3, fila 1); en pantallas grandes, al final de la fila.
              className="col-start-3 row-start-1 mb-0.5 sm:order-4"
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
  recetas: RecetaElegible[];
}) {
  const opciones = useFieldArray({
    control,
    name: `comidas.${indiceComida}.opciones`,
  });

  return (
    // Sin sangría en el celular: cada nivel de sangría le quitaba ancho a los
    // campos de los alimentos, que son los que más lo necesitan.
    <div className="space-y-2 sm:pl-6">
      {opciones.fields.map((opcion, indice) => (
        <div
          key={opcion.id}
          className="space-y-3 rounded-md border border-dashed p-2.5 sm:p-3"
        >
          {/* El título de la opción y el botón de quitar van ARRIBA, y el
              texto debajo a lo ancho: al costado, «Opción 1» se comía una
              columna entera en cada fila de la opción. */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-primary">
              Opción {indice + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Quitar opción"
              disabled={opciones.fields.length === 1}
              onClick={() => opciones.remove(indice)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <FormField
            control={control}
            name={`comidas.${indiceComida}.opciones.${indice}.contenido`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Café con leche descremada + 2 tostadas… (opcional si elegís receta o alimentos)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <AlimentosDeOpcion
            control={control}
            indiceComida={indiceComida}
            indiceOpcion={indice}
          />

          {/* La receta va DEBAJO de los alimentos: lo habitual es armar la
              opción con alimentos, y la receta es un agregado opcional. */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Receta (opcional)
            </p>
            <div className="flex flex-wrap items-start gap-2">
              <FormField
                control={control}
                name={`comidas.${indiceComida}.opciones.${indice}.recetaId`}
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    {/* Un modal con búsqueda, etiquetas y fotos, y la pestaña
                        de la plataforma: un desplegable con todo el recetario
                        dejaba de servir pasadas las veinte recetas. */}
                    <BuscadorReceta
                      recetaId={
                        field.value && field.value !== SIN_RECETA
                          ? field.value
                          : null
                      }
                      recetas={recetas}
                      onCambiar={(id) => field.onChange(id ?? SIN_RECETA)}
                    />
                  </FormItem>
                )}
              />
              <PorcionesDeReceta
                control={control}
                indiceComida={indiceComida}
                indiceOpcion={indice}
              />
            </div>
          </div>

          <ResumenOpcion
            control={control}
            indiceComida={indiceComida}
            indiceOpcion={indice}
            recetas={recetas}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => opciones.append(opcionVacia())}
      >
        <Plus className="h-4 w-4" /> Agregar opción
      </Button>
    </div>
  );
}

/** Porciones de la receta: solo se muestran si hay una elegida. */
function PorcionesDeReceta({
  control,
  indiceComida,
  indiceOpcion,
}: {
  control: Control<DatosFormulario>;
  indiceComida: number;
  indiceOpcion: number;
}) {
  const recetaId = useWatch({
    control,
    name: `comidas.${indiceComida}.opciones.${indiceOpcion}.recetaId`,
  });
  if (!recetaId || recetaId === SIN_RECETA) return null;
  return (
    <FormField
      control={control}
      name={`comidas.${indiceComida}.opciones.${indiceOpcion}.porciones`}
      render={({ field }) => (
        <FormItem className="w-28">
          <FormControl>
            <Input
              className="h-8 text-xs"
              inputMode="decimal"
              placeholder="Porciones: 1"
              aria-label="Porciones de la receta"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Los macros de un alimento, con su nombre y unidad a la vista: al traer un
 * alimento de la base los campos vienen llenos, y con solo el placeholder no
 * se sabía qué número era cada uno.
 */
/**
 * Etiqueta de un campo del alimento: un renglón de alto FIJO (h-4), así el
 * input de al lado y el botón de quitar quedan a la misma altura.
 */
const ETIQUETA_CAMPO =
  "block h-4 truncate text-[0.7rem] leading-4 text-muted-foreground";

const CAMPOS_MACRO = [
  ["caloriasPor100", "Calorías", "kcal/100 g"],
  ["proteinasPor100", "Proteínas", "g/100 g"],
  ["carbohidratosPor100", "Carbohidratos", "g/100 g"],
  ["grasasPor100", "Grasas", "g/100 g"],
] as const;

function itemVacio(): ItemOpcionFormulario {
  return {
    nombre: "",
    cantidadGramos: "",
    caloriasPor100: "",
    proteinasPor100: "",
    carbohidratosPor100: "",
    grasasPor100: "",
    fuente: "MANUAL",
    referenciaExterna: "",
    alimentoOrigenId: "",
  };
}

const texto = (valor: number | null | undefined): string =>
  valor == null ? "" : String(valor);

/** Los alimentos sueltos de una opción, con el buscador para sumarlos. */
function AlimentosDeOpcion({
  control,
  indiceComida,
  indiceOpcion,
}: {
  control: Control<DatosFormulario>;
  indiceComida: number;
  indiceOpcion: number;
}) {
  const ruta =
    `comidas.${indiceComida}.opciones.${indiceOpcion}.items` as const;
  const items = useFieldArray({ control, name: ruta });

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Alimentos</p>
      <BuscadorAlimento
        onElegir={(alimento) =>
          items.append({
            nombre: alimento.marca
              ? `${alimento.nombre} (${alimento.marca})`
              : alimento.nombre,
            cantidadGramos: "100",
            caloriasPor100: texto(alimento.caloriasPor100),
            proteinasPor100: texto(alimento.proteinasPor100),
            carbohidratosPor100: texto(alimento.carbohidratosPor100),
            grasasPor100: texto(alimento.grasasPor100),
            fuente: alimento.fuente ?? "MANUAL",
            referenciaExterna: alimento.referenciaExterna ?? "",
            alimentoOrigenId: alimento.id ?? "",
          })
        }
      />
      {items.fields.map((item, indice) => (
        <div key={item.id} className="rounded-md bg-muted/40 p-2">
          <div className="flex items-start gap-2">
            <FormField
              control={control}
              name={`${ruta}.${indice}.nombre`}
              render={({ field }) => (
                <FormItem className="min-w-0 flex-1 space-y-1">
                  <FormLabel className={ETIQUETA_CAMPO}>Alimento</FormLabel>
                  <FormControl>
                    <Input className="h-8" placeholder="Alimento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`${ruta}.${indice}.cantidadGramos`}
              render={({ field }) => (
                <FormItem className="w-20 shrink-0 space-y-1 sm:w-24">
                  <FormLabel className={ETIQUETA_CAMPO}>Cantidad (g)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      inputMode="decimal"
                      placeholder="g"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              // Alto de la etiqueta (h-4) + el espacio (space-y-1): queda a la
              // altura de los inputs de al lado.
              className="mt-5 h-8 w-8 shrink-0"
              aria-label="Quitar alimento"
              onClick={() => items.remove(indice)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:pr-10">
            {CAMPOS_MACRO.map(([campo, etiqueta, unidad]) => (
              <FormField
                key={campo}
                control={control}
                name={`${ruta}.${indice}.${campo}`}
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-1">
                    {/* Nombre y unidad en dos renglones SIEMPRE: con un solo
                        renglón, «Carbohidratos (g/100 g)» se partía y su input
                        quedaba más abajo que los otros tres. */}
                    <FormLabel className="block text-[0.7rem] leading-4 text-muted-foreground">
                      <span className="block truncate">{etiqueta}</span>
                      <span className="block truncate text-muted-foreground/70">
                        {unidad}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-8 text-xs"
                        inputMode="decimal"
                        placeholder="—"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => items.append(itemVacio())}
      >
        <Plus className="h-3.5 w-3.5" /> Cargar un alimento a mano
      </Button>
    </div>
  );
}

/**
 * Lo que suma la opción mientras se edita: alimentos + receta × porciones.
 *
 * Es el espejo en pantalla de `macrosDeOpcion` del dominio (la presentación no
 * puede llamarlo); la cuenta que manda es la del servidor, que es la que usan
 * las combinaciones del día.
 */
function ResumenOpcion({
  control,
  indiceComida,
  indiceOpcion,
  recetas,
}: {
  control: Control<DatosFormulario>;
  indiceComida: number;
  indiceOpcion: number;
  recetas: RecetaElegible[];
}) {
  const opcion = useWatch({
    control,
    name: `comidas.${indiceComida}.opciones.${indiceOpcion}`,
  });
  if (!opcion) return null;

  const deItems = calcularTotales(opcion.items ?? []);
  const receta =
    opcion.recetaId && opcion.recetaId !== SIN_RECETA
      ? recetas.find((r) => r.id === opcion.recetaId)
      : undefined;
  const porciones = aNumero(opcion.porciones) ?? 1;
  const deReceta = receta ? escalarMacros(receta.macros, porciones) : null;
  const total = deReceta ? sumarMacros(deItems, deReceta) : deItems;

  if (!hayMacros(total) && !receta) return null;

  return (
    <div className="space-y-0.5 rounded-md bg-muted/50 px-3 py-2 text-xs">
      <p>
        <span className="font-medium">Esta opción: </span>
        {macrosEnTexto(total) || "sin macros cargados"}
      </p>
      {receta && (
        <p className="text-muted-foreground">
          {`Receta «${receta.nombre}» × ${porciones}: ${
            macrosEnTexto(deReceta!) || "sin macros"
          }`}
          {(opcion.items ?? []).length > 0 &&
            ` + alimentos: ${macrosEnTexto(deItems) || "sin macros"}`}
          . Los ingredientes de la receta ya están en sus macros y no se suman
          de nuevo.
        </p>
      )}
    </div>
  );
}

function macrosEnTexto(m: Macros): string {
  return [
    m.calorias != null && `${m.calorias} kcal`,
    m.proteinasG != null && `${m.proteinasG} g P`,
    m.carbohidratosG != null && `${m.carbohidratosG} g C`,
    m.grasasG != null && `${m.grasasG} g G`,
  ]
    .filter(Boolean)
    .join(" · ");
}

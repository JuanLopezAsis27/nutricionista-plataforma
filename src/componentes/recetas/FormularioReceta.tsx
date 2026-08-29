"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ImagePlus,
  FileText,
  LinkIcon,
  X,
  Plus,
  Trash2,
  Search,
  Loader2,
} from "lucide-react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import type { AlimentoNutricionalSalidaDto } from "@/aplicacion/dtos/nutricion.dto";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { useNutricion } from "@/lib/hooks/useNutricion";
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

const numeroOpcional = z
  .string()
  .refine(
    (v) => v === "" || Number(v.replace(",", ".")) >= 0,
    "Debe ser un número positivo",
  );

const ingredienteEsquema = z.object({
  nombre: z.string().min(1, "Nombre").max(200),
  cantidadGramos: numeroOpcional,
  caloriasPor100: numeroOpcional,
  proteinasPor100: numeroOpcional,
  carbohidratosPor100: numeroOpcional,
  grasasPor100: numeroOpcional,
  fuente: z.string(),
  referenciaExterna: z.string(),
});

const esquema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(1000),
  porciones: numeroOpcional,
  ingredientes: z.array(ingredienteEsquema).max(100),
  preparacion: z.string().max(5000),
  etiquetas: z.string().max(500),
  enlaces: z.string().max(5000),
  calorias: numeroOpcional,
  proteinasG: numeroOpcional,
  carbohidratosG: numeroOpcional,
  grasasG: numeroOpcional,
});
type DatosFormulario = z.infer<typeof esquema>;
type IngredienteFormulario = DatosFormulario["ingredientes"][number];

function aNumero(valor: string | null | undefined): number | null {
  if (valor == null) return null;
  const texto = String(valor).trim();
  if (texto === "") return null;
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

interface Macros {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
}

/** Suma los macros de los ingredientes con cantidad y datos (espejo del dominio). */
function calcularTotales(ingredientes: IngredienteFormulario[]): Macros {
  let cal = 0;
  let prot = 0;
  let carb = 0;
  let gras = 0;
  let hayCal = false;
  let hayProt = false;
  let hayCarb = false;
  let hayGras = false;
  for (const ing of ingredientes) {
    const gramos = aNumero(ing.cantidadGramos);
    if (gramos == null || gramos <= 0) continue;
    const factor = gramos / 100;
    const c = aNumero(ing.caloriasPor100);
    const p = aNumero(ing.proteinasPor100);
    const h = aNumero(ing.carbohidratosPor100);
    const g = aNumero(ing.grasasPor100);
    if (c != null) {
      cal += c * factor;
      hayCal = true;
    }
    if (p != null) {
      prot += p * factor;
      hayProt = true;
    }
    if (h != null) {
      carb += h * factor;
      hayCarb = true;
    }
    if (g != null) {
      gras += g * factor;
      hayGras = true;
    }
  }
  return {
    calorias: hayCal ? Math.round(cal) : null,
    proteinasG: hayProt ? redondear1(prot) : null,
    carbohidratosG: hayCarb ? redondear1(carb) : null,
    grasasG: hayGras ? redondear1(gras) : null,
  };
}

function porPorcion(m: Macros, porciones: number | null): Macros {
  const p = porciones != null && porciones > 0 ? porciones : 1;
  return {
    calorias: m.calorias != null ? Math.round(m.calorias / p) : null,
    proteinasG: m.proteinasG != null ? redondear1(m.proteinasG / p) : null,
    carbohidratosG:
      m.carbohidratosG != null ? redondear1(m.carbohidratosG / p) : null,
    grasasG: m.grasasG != null ? redondear1(m.grasasG / p) : null,
  };
}

function hayMacros(m: Macros): boolean {
  return (
    m.calorias != null ||
    m.proteinasG != null ||
    m.carbohidratosG != null ||
    m.grasasG != null
  );
}

const INGREDIENTE_VACIO: IngredienteFormulario = {
  nombre: "",
  cantidadGramos: "",
  caloriasPor100: "",
  proteinasPor100: "",
  carbohidratosPor100: "",
  grasasPor100: "",
  fuente: "MANUAL",
  referenciaExterna: "",
};

interface PropsFormularioReceta {
  recetaInicial?: RecetaSalidaDto | null;
  onTerminado: () => void;
}

/**
 * Alta/edición de una receta: ingredientes estructurados (con búsqueda de datos
 * nutricionales en Open Food Facts y suma automática de macros), preparación,
 * etiquetas y fotos.
 */
export function FormularioReceta({
  recetaInicial,
  onTerminado,
}: PropsFormularioReceta) {
  const { crear, actualizar } = useRecetas();
  const enviando = crear.isPending || actualizar.isPending;

  const [fotosNuevas, setFotosNuevas] = useState<ArchivoSalidaDto[]>([]);
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
      etiquetas: datos.etiquetas
        .split(",")
        .map((etiqueta) => etiqueta.trim())
        .filter(Boolean),
      enlaces: datos.enlaces
        .split(/[\n,]/)
        .map((enlace) => enlace.trim())
        .filter(Boolean),
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

    if (recetaInicial) {
      actualizar.mutate(
        {
          id: recetaInicial.id,
          ...cuerpo,
          fotoIdsNuevos: fotoIds,
          documentoIdsNuevos: documentoIds,
        },
        { onSuccess: onTerminado },
      );
    } else {
      crear.mutate(
        { ...cuerpo, fotoIds, documentoIds },
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
            <ul className="space-y-1">
              {fotosNuevas.map((foto) => (
                <li
                  key={foto.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="truncate">{foto.nombreOriginal}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar foto"
                    onClick={() =>
                      setFotosNuevas((previas) =>
                        previas.filter((f) => f.id !== foto.id),
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
            accept="image/*"
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
function TotalItem({ etiqueta, macros }: { etiqueta: string; macros: Macros }) {
  const partes = [
    macros.calorias != null && `${macros.calorias} kcal`,
    macros.proteinasG != null && `${macros.proteinasG} g P`,
    macros.carbohidratosG != null && `${macros.carbohidratosG} g C`,
    macros.grasasG != null && `${macros.grasasG} g G`,
  ].filter(Boolean);
  return (
    <span>
      <span className="text-muted-foreground">{etiqueta}:</span>{" "}
      {partes.join(" · ")}
    </span>
  );
}

/** Una fila editable de ingrediente (nombre + gramos + macros por 100 g). */
function FilaIngrediente({
  form,
  indice,
  onQuitar,
}: {
  form: UseFormReturn<DatosFormulario>;
  indice: number;
  onQuitar: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed p-3">
      <div className="flex items-start gap-2">
        <FormField
          control={form.control}
          name={`ingredientes.${indice}.nombre`}
          render={({ field }) => (
            <FormItem className="min-w-0 flex-1">
              <FormControl>
                <Input placeholder="Ingrediente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-24 shrink-0">
          <FormField
            control={form.control}
            name={`ingredientes.${indice}.cantidadGramos`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="g"
                    aria-label="Gramos"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quitar ingrediente"
          className="shrink-0"
          onClick={onQuitar}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 pr-10">
        {(
          [
            ["caloriasPor100", "kcal/100g"],
            ["proteinasPor100", "P/100g"],
            ["carbohidratosPor100", "C/100g"],
            ["grasasPor100", "G/100g"],
          ] as const
        ).map(([nombre, etiqueta]) => (
          <FormField
            key={nombre}
            control={form.control}
            name={`ingredientes.${indice}.${nombre}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[0.65rem] text-muted-foreground">
                  {etiqueta}
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="—"
                    className="h-8"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Buscador de alimentos contra Open Food Facts; agrega el elegido como ingrediente. */
function BuscadorAlimento({
  onElegir,
}: {
  onElegir: (alimento: AlimentoNutricionalSalidaDto) => void;
}) {
  const { buscarAlimento } = useNutricion();
  const [termino, setTermino] = useState("");
  const [debounced, setDebounced] = useState("");
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(termino.trim()), 400);
    return () => clearTimeout(t);
  }, [termino]);

  const habilitado = debounced.length >= 2;
  const consulta = buscarAlimento(
    { termino: debounced, limite: 8 },
    { enabled: habilitado, staleTime: 60_000 },
  );
  const resultados = consulta.data ?? [];

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border px-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={termino}
          onChange={(e) => {
            setTermino(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar alimento (ej. arroz, pollo, yogur)…"
          className="border-0 px-1 shadow-none focus-visible:ring-0"
        />
        {consulta.isFetching && habilitado && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>

      {abierto && habilitado && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {resultados.length === 0 && !consulta.isFetching && (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Sin resultados. Cargá el ingrediente a mano.
            </p>
          )}
          {resultados.map((alimento, i) => (
            <button
              key={`${alimento.referenciaExterna ?? alimento.nombre}-${i}`}
              type="button"
              className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                onElegir(alimento);
                setTermino("");
                setDebounced("");
                setAbierto(false);
              }}
            >
              <span className="font-medium">
                {alimento.nombre}
                {alimento.marca ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {alimento.marca}
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-muted-foreground">
                {[
                  alimento.caloriasPor100 != null &&
                    `${alimento.caloriasPor100} kcal`,
                  alimento.proteinasPor100 != null &&
                    `${alimento.proteinasPor100} P`,
                  alimento.carbohidratosPor100 != null &&
                    `${alimento.carbohidratosPor100} C`,
                  alimento.grasasPor100 != null && `${alimento.grasasPor100} G`,
                ]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                (por 100 g)
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

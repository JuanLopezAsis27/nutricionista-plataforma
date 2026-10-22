"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Copy } from "lucide-react";
import {
  ETIQUETA_DIA_LARGA,
  type ModoMetasSemana,
} from "@/dominio/entidades/PlanSemanal";
import type { TipoMeta } from "@/dominio/servicios/comparacionMacros";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { ETIQUETAS_TIPO_META } from "@/componentes/planes/formulario/SeccionMetasMacros";
import { MACROS_META } from "../metas";
import type { DatosFormulario, ValoresMetaFormulario } from "./esquema";

const MODOS: { valor: ModoMetasSemana; etiqueta: string }[] = [
  { valor: "GENERAL", etiqueta: "Las mismas todos los días" },
  { valor: "POR_DIA", etiqueta: "Distintas por día" },
];

/**
 * Las metas propias del plan semanal (migración 91), contra las que se
 * compara el total de cada día.
 *
 * Son del plan semanal y no de un plan nutricional asignado: con varios
 * asignados solo contaba uno. Se declaran de dos maneras:
 *
 * - **Las mismas todos los días**: cuatro valores, como en el plan.
 * - **Distintas por día**: una fila por día (el sábado con más calorías, los
 *   días de entrenamiento con más carbohidratos). Un día vacío queda sin meta.
 *
 * El tipo (aproximada, como mínimo, como máximo) es uno por macro en los dos
 * modos: la proteína es un piso toda la semana aunque cada día pida otra
 * cantidad.
 */
export function SeccionMetasSemana() {
  const form = useFormContext<DatosFormulario>();
  const modo = useWatch({ control: form.control, name: "metas.modo" });

  function cambiarModo(nuevo: ModoMetasSemana) {
    if (nuevo === modo) return;
    // Al pasar a «por día» con la semana vacía, cada día arranca con las
    // metas generales: lo normal es retocar dos o tres días, no escribir 28
    // números.
    if (nuevo === "POR_DIA") {
      const { general, porDia } = form.getValues("metas");
      const semanaVacia = porDia.every(esVacia);
      if (semanaVacia && !esVacia(general)) {
        form.setValue(
          "metas.porDia",
          porDia.map((d) => ({ ...general, dia: d.dia })),
          { shouldDirty: true },
        );
      }
    }
    form.setValue("metas.modo", nuevo, { shouldDirty: true });
  }

  function copiarElLunes() {
    const porDia = form.getValues("metas.porDia");
    const lunes = porDia[0];
    if (!lunes) return;
    const { dia: _dia, ...valores } = lunes;
    form.setValue(
      "metas.porDia",
      porDia.map((d) => ({ ...valores, dia: d.dia })),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">
        Metas del plan (opcionales)
      </legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Contra estas metas se compara el total de cada día.
        </p>
        <div
          className="flex rounded-lg border p-0.5"
          role="radiogroup"
          aria-label="Cómo se declaran las metas"
        >
          {MODOS.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={modo === opcion.valor}
              onClick={() => cambiarModo(opcion.valor)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                modo === opcion.valor
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {modo === "GENERAL" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MACROS_META.map((macro) => (
            <div key={macro.clave} className="space-y-1.5">
              <CampoValor
                nombre={`metas.general.${macro.clave}`}
                etiqueta={`${macro.etiqueta} (${macro.unidad})`}
              />
              <CampoTipo clave={macro.clave} etiqueta={macro.etiqueta} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-separate border-spacing-x-1 border-spacing-y-1 text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground">
                    Día
                  </th>
                  {MACROS_META.map((macro) => (
                    <th
                      key={macro.clave}
                      className="text-left text-xs font-medium text-muted-foreground"
                    >
                      {macro.etiqueta} ({macro.unidad})
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="text-left text-[0.65rem] font-normal text-muted-foreground">
                    Se lee como
                  </th>
                  {MACROS_META.map((macro) => (
                    <th key={macro.clave} className="font-normal">
                      <CampoTipo
                        clave={macro.clave}
                        etiqueta={macro.etiqueta}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.getValues("metas.porDia").map((fila, indice) => (
                  <tr key={fila.dia}>
                    <th className="pr-1 text-left text-xs font-medium">
                      {ETIQUETA_DIA_LARGA[fila.dia]}
                    </th>
                    {MACROS_META.map((macro) => (
                      <td key={macro.clave}>
                        <CampoValor
                          nombre={`metas.porDia.${indice}.${macro.clave}`}
                          etiqueta={`${macro.etiqueta} del ${ETIQUETA_DIA_LARGA[fila.dia].toLowerCase()}`}
                          oculta
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Un día sin valores queda sin meta.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copiarElLunes}
            >
              <Copy className="h-4 w-4" />
              Copiar el lunes al resto
            </Button>
          </div>
        </div>
      )}
    </fieldset>
  );
}

type NombreValor =
  | `metas.general.${keyof ValoresMetaFormulario}`
  | `metas.porDia.${number}.${keyof ValoresMetaFormulario}`;

function CampoValor({
  nombre,
  etiqueta,
  oculta = false,
}: {
  nombre: NombreValor;
  etiqueta: string;
  /** En la tabla por día el encabezado de la columna ya dice qué es. */
  oculta?: boolean;
}) {
  const form = useFormContext<DatosFormulario>();
  return (
    <FormField
      control={form.control}
      name={nombre}
      render={({ field }) => (
        <FormItem className="space-y-1">
          <FormLabel className={cn("text-xs", oculta && "sr-only")}>
            {etiqueta}
          </FormLabel>
          <FormControl>
            <Input
              inputMode="decimal"
              placeholder="Sin meta"
              className="h-8"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CampoTipo({
  clave,
  etiqueta,
}: {
  clave: (typeof MACROS_META)[number]["clave"];
  etiqueta: string;
}) {
  const form = useFormContext<DatosFormulario>();
  return (
    <FormField
      control={form.control}
      name={`metas.tipos.${clave}`}
      render={({ field }) => (
        <FormItem>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger
                className="h-8 text-xs"
                aria-label={`Tipo de meta de ${etiqueta}`}
              >
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(Object.keys(ETIQUETAS_TIPO_META) as TipoMeta[]).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {ETIQUETAS_TIPO_META[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}

function esVacia(valores: ValoresMetaFormulario): boolean {
  return (
    valores.calorias.trim() === "" &&
    valores.proteinasG.trim() === "" &&
    valores.carbohidratosG.trim() === "" &&
    valores.grasasG.trim() === ""
  );
}

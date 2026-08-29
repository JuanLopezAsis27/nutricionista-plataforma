"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import type {
  ObjetivoComposicionDto,
  ValorActualVariableDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import {
  VARIABLES_COMPOSICION,
  definicionVariable,
  exigeMetodoGrasa,
  type VariableComposicion,
} from "@/dominio/entidades/ObjetivoComposicion";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
} from "@/dominio/servicios/grasaPorPliegues";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { aFechaISO, formatearNumero } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Slider } from "@/componentes/ui/slider";
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

export const esquema = z.object({
  variable: z.enum(VARIABLES_COMPOSICION),
  metodoGrasa: z.enum(METODOS_GRASA),
  valorObjetivo: z.string().min(1, "Indicá el valor a alcanzar"),
  fechaObjetivo: z.string(),
  notas: z.string().max(1000),
});
type DatosFormulario = z.infer<typeof esquema>;

interface Props {
  pacienteId: string;
  objetivoInicial?: ObjetivoComposicionDto | null;
  /** Variables que ya tienen objetivo: hay una sola meta vigente por variable. */
  variablesOcupadas: VariableComposicion[];
  /** Valores de la última medición: el punto de partida de la meta. */
  valoresActuales: ValorActualVariableDto[];
  onTerminado: () => void;
}

/** Alta y edición de una meta de composición corporal. */
export function FormularioObjetivoComposicion({
  pacienteId,
  objetivoInicial,
  variablesOcupadas,
  valoresActuales,
  onTerminado,
}: Props) {
  const { guardarObjetivoComposicion } = useEvaluacion();
  const editando = Boolean(objetivoInicial);

  const disponibles = VARIABLES_COMPOSICION.filter(
    (variable) =>
      variable === objetivoInicial?.variable ||
      !variablesOcupadas.includes(variable),
  );

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      variable: objetivoInicial?.variable ?? disponibles[0] ?? "PESO",
      metodoGrasa: objetivoInicial?.metodoGrasa ?? "YUHASZ_CARTER",
      valorObjetivo:
        objetivoInicial?.valorObjetivo != null
          ? String(objetivoInicial.valorObjetivo)
          : "",
      fechaObjetivo: objetivoInicial?.fechaObjetivo
        ? aFechaISO(objetivoInicial.fechaObjetivo)
        : "",
      notas: objetivoInicial?.notas ?? "",
    },
  });

  const variable = form.watch("variable");
  const metodoGrasa = form.watch("metodoGrasa");
  const definicion = definicionVariable(variable);
  const pideMetodo = exigeMetodoGrasa(variable);

  // Valor de hoy para la combinación elegida: el ancla de la meta.
  const actual =
    valoresActuales.find(
      (v) =>
        v.variable === variable &&
        (!pideMetodo || v.metodoGrasa === metodoGrasa),
    )?.valor ?? null;

  const valorNumero = aNumeroONull(form.watch("valorObjetivo"));

  const { setValue } = form;
  /**
   * Al cambiar de variable (o de ecuación) la meta anterior deja de tener
   * sentido: se reencuadra en el valor actual, que es de donde parte el
   * paciente. En edición no se toca lo que el profesional ya fijó.
   */
  useEffect(() => {
    if (editando) return;
    setValue("valorObjetivo", actual != null ? String(actual) : "");
  }, [variable, metodoGrasa, actual, editando, setValue]);

  const rango = rangoDelSlider(actual, definicion.min, definicion.max);
  const paso = pasoDe(definicion.min, definicion.max);
  const brecha =
    actual != null && valorNumero != null ? valorNumero - actual : null;
  const unidad = definicion.unidad ? ` ${definicion.unidad}` : "";

  function alEnviar(datos: DatosFormulario) {
    const valor = aNumeroONull(datos.valorObjetivo);
    if (valor == null) {
      form.setError("valorObjetivo", { message: "Tiene que ser un número" });
      return;
    }
    if (valor < definicion.min || valor > definicion.max) {
      form.setError("valorObjetivo", {
        message: `Entre ${definicion.min} y ${definicion.max}${unidad}`,
      });
      return;
    }

    guardarObjetivoComposicion.mutate(
      {
        pacienteId,
        variable: datos.variable,
        metodoGrasa: pideMetodo ? datos.metodoGrasa : null,
        valorObjetivo: valor,
        fechaObjetivo: datos.fechaObjetivo
          ? new Date(datos.fechaObjetivo)
          : null,
        notas: datos.notas.trim() || null,
      },
      { onSuccess: onTerminado },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <FormField
          control={form.control}
          name="variable"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variable</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={editando}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {disponibles.map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                      {definicionVariable(opcion).etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editando && (
                <p className="text-xs text-muted-foreground">
                  La variable no se cambia: creá otro objetivo si querés seguir
                  otra.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {pideMetodo && (
          <FormField
            control={form.control}
            name="metodoGrasa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ecuación con la que se sigue</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={editando}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {METODOS_GRASA.map((metodo) => (
                      <SelectItem key={metodo} value={metodo}>
                        {DEFINICIONES_METODO[metodo].etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {editando
                    ? "La ecuación no se cambia: la serie histórica quedaría partida en dos."
                    : `${DEFINICIONES_METODO[field.value].poblacion}. Toda la serie va a usar esta ecuación.`}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* La meta se fija moviéndose DESDE el valor de hoy, no escribiendo un
            número en el aire: así se ve la distancia que se está proponiendo. */}
        <FormField
          control={form.control}
          name="valorObjetivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor a alcanzar</FormLabel>
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  {actual != null ? (
                    <span className="text-sm text-muted-foreground">
                      Hoy{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatearNumero(actual)}
                        {unidad}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Sin medición para esta variable
                    </span>
                  )}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="flex items-center gap-1.5">
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        className="h-9 w-24 text-right font-semibold tabular-nums"
                        aria-label="Valor objetivo"
                        {...field}
                      />
                    </FormControl>
                    {definicion.unidad && (
                      <span className="text-sm text-muted-foreground">
                        {definicion.unidad}
                      </span>
                    )}
                  </div>
                </div>

                <Slider
                  aria-label={`Valor objetivo de ${definicion.etiqueta}`}
                  min={rango.min}
                  max={rango.max}
                  step={paso}
                  value={acotar(valorNumero ?? actual ?? rango.min, rango)}
                  onValueChange={(valor) =>
                    field.onChange(String(redondearAlPaso(valor, paso)))
                  }
                />

                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">
                    {formatearNumero(rango.min)}
                  </span>
                  {brecha != null && Math.abs(brecha) > 1e-9 ? (
                    <span className="font-medium text-foreground">
                      {brecha > 0 ? "Subir" : "Bajar"}{" "}
                      <span className="tabular-nums">
                        {formatearNumero(Math.abs(brecha))}
                        {unidad}
                      </span>
                    </span>
                  ) : (
                    <span>Arrastrá o escribí el valor</span>
                  )}
                  <span className="tabular-nums">
                    {formatearNumero(rango.max)}
                  </span>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fechaObjetivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha objetivo (opcional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Con fecha, el dashboard avisa si el ritmo alcanza.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Por qué se plantea esta meta"
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
            disabled={guardarObjetivoComposicion.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={guardarObjetivoComposicion.isPending}>
            {guardarObjetivoComposicion.isPending
              ? "Guardando…"
              : editando
                ? "Guardar cambios"
                : "Crear objetivo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * Rango del slider.
 *
 * Con un valor actual se encuadra en ±30 % alrededor suyo: sobre el rango
 * absoluto de la variable (masa adiposa de 1 a 200 kg) un centímetro de
 * arrastre saltaría diez kilos. Sin valor actual no hay dónde anclar y se usa
 * el rango completo. El input numérico sigue aceptando cualquier valor válido,
 * así que el encuadre no recorta lo que se puede fijar.
 */
function rangoDelSlider(
  actual: number | null,
  min: number,
  max: number,
): { min: number; max: number } {
  if (actual == null) return { min, max };
  const margen = Math.abs(actual) * 0.3;
  return {
    min: Math.max(min, redondear(actual - margen)),
    max: Math.min(max, redondear(actual + margen)),
  };
}

/** Granularidad del slider según la escala de la variable. */
function pasoDe(min: number, max: number): number {
  const amplitud = max - min;
  if (amplitud <= 5) return 0.01; // índice cintura/cadera
  if (amplitud <= 100) return 0.1; // kg, %, IMC
  return 1; // mm de pliegues
}

function acotar(valor: number, rango: { min: number; max: number }): number {
  return Math.min(rango.max, Math.max(rango.min, valor));
}

function redondearAlPaso(valor: number, paso: number): number {
  const decimales = paso >= 1 ? 0 : paso >= 0.1 ? 1 : 2;
  return Number(valor.toFixed(decimales));
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** "" → null; "12,5" o "12.5" → 12,5 (acepta coma decimal, como la planilla). */
function aNumeroONull(valor: string | null | undefined): number | null {
  const limpio = (valor ?? "").trim().replace(",", ".");
  if (limpio === "") return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

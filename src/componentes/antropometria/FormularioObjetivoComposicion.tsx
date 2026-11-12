"use client";

import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import type {
  ObjetivoComposicionDto,
  ValorActualVariableDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import {
  ETIQUETAS_ORIGEN,
  ORIGENES_VARIABLE,
  VARIABLES_COMPOSICION,
  definicionVariable,
  exigeMetodoGrasa,
  origenDeVariable,
  type VariableComposicion,
} from "@/dominio/entidades/ObjetivoComposicion";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
  type MetodoGrasa,
} from "@/dominio/servicios/grasaPorPliegues";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import { aFechaISO, formatearMedida } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
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
  SelectGroup,
  SelectLabel,
} from "@/componentes/ui/select";

/**
 * Las dos formas de la meta. Un VALOR se da por cumplido al pasarse en la
 * dirección buscada; un RANGO, solo estando adentro (ver `MetaNumerica`).
 */
const TIPOS_META = [
  {
    valor: "VALOR",
    etiqueta: "Un valor",
    ayuda:
      "Pasarse en la dirección buscada también cuenta como logrado: bajar a 11 cuando la meta era 12 es cumplirla.",
  },
  {
    valor: "RANGO",
    etiqueta: "Un rango",
    ayuda:
      "Se cumple solo estando entre el mínimo y el máximo: pasarse del otro lado vuelve a estar fuera del objetivo.",
  },
] as const;

export const esquema = z.object({
  variable: z.enum(VARIABLES_COMPOSICION),
  metodoGrasa: z.enum(METODOS_GRASA),
  tipoMeta: z.enum(["VALOR", "RANGO"]),
  // Ninguno de los tres números es obligatorio ACÁ: cuáles se piden depende
  // de `tipoMeta`, y un campo obligatorio que no se dibuja deja el botón
  // mudo. Los valida `leerMeta`, sobre el campo que está en pantalla.
  valorObjetivo: z.string(),
  valorMinimo: z.string(),
  valorMaximo: z.string(),
  fechaObjetivo: z.string(),
  notas: z.string().max(1000),
});
type DatosFormulario = z.infer<typeof esquema>;

/** Los tres números de la meta, ya leídos: uno solo o los dos del rango. */
interface ValoresMeta {
  valorObjetivo: number | null;
  valorMinimo: number | null;
  valorMaximo: number | null;
}

/** Una meta ya planteada: variable más la ecuación con la que se sigue. */
export interface CombinacionObjetivo {
  variable: VariableComposicion;
  metodoGrasa: MetodoGrasa | null;
}

interface Props {
  pacienteId: string;
  objetivoInicial?: ObjetivoComposicionDto | null;
  /**
   * Combinaciones que ya tienen meta. Hay una sola vigente por variable Y
   * ecuación: una variable de grasa sigue disponible mientras quede alguna
   * ecuación sin usar.
   */
  combinacionesOcupadas: CombinacionObjetivo[];
  /** Valores de la última medición: el punto de partida de la meta. */
  valoresActuales: ValorActualVariableDto[];
  onTerminado: () => void;
}

/** Alta y edición de una meta de composición corporal. */
export function FormularioObjetivoComposicion({
  pacienteId,
  objetivoInicial,
  combinacionesOcupadas,
  valoresActuales,
  onTerminado,
}: Props) {
  const { guardarObjetivoComposicion } = useEvaluacion();
  const editando = Boolean(objetivoInicial);

  // Solo se ofrecen las ecuaciones que la configuración del consultorio deja
  // visibles; una meta vieja con una ecuación ahora oculta conserva su valor.
  const { obtener: obtenerConfiguracion } = useConfiguracion();
  const formulasVisibles =
    obtenerConfiguracion().data?.formulasGrasaVisibles ?? METODOS_GRASA;
  const metodosDelSelect = METODOS_GRASA.filter(
    (metodo) =>
      formulasVisibles.includes(metodo) ||
      metodo === objetivoInicial?.metodoGrasa,
  );

  /** ¿Esta combinación ya tiene meta (y no es la que se está editando)? */
  const ocupada = (
    variable: VariableComposicion,
    metodoGrasa: MetodoGrasa | null,
  ): boolean => {
    if (
      editando &&
      objetivoInicial!.variable === variable &&
      objetivoInicial!.metodoGrasa === metodoGrasa
    ) {
      return false;
    }
    return combinacionesOcupadas.some(
      (c) => c.variable === variable && c.metodoGrasa === metodoGrasa,
    );
  };

  /**
   * Una variable de grasa se agota recién cuando TODAS sus ecuaciones tienen
   * meta; las demás, con una sola. Es la diferencia entre "esta variable ya
   * está" y "esta forma de medir ya está".
   */
  const disponibles = VARIABLES_COMPOSICION.filter((variable) =>
    exigeMetodoGrasa(variable)
      ? metodosDelSelect.some((metodo) => !ocupada(variable, metodo))
      : !ocupada(variable, null),
  );

  const porOrigen = ORIGENES_VARIABLE.map((origen) => ({
    origen,
    variables: disponibles.filter((v) => origenDeVariable(v) === origen),
  })).filter((grupo) => grupo.variables.length > 0);

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      variable: objetivoInicial?.variable ?? disponibles[0] ?? "PESO",
      metodoGrasa: objetivoInicial?.metodoGrasa ?? "YUHASZ_CARTER",
      tipoMeta: objetivoInicial?.valorMinimo != null ? "RANGO" : "VALOR",
      valorObjetivo:
        objetivoInicial?.valorObjetivo != null
          ? String(objetivoInicial.valorObjetivo)
          : "",
      valorMinimo:
        objetivoInicial?.valorMinimo != null
          ? String(objetivoInicial.valorMinimo)
          : "",
      valorMaximo:
        objetivoInicial?.valorMaximo != null
          ? String(objetivoInicial.valorMaximo)
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

  const tipoMeta = form.watch("tipoMeta");
  const valorNumero = aNumeroONull(form.watch("valorObjetivo"));
  const minimoNumero = aNumeroONull(form.watch("valorMinimo"));
  const maximoNumero = aNumeroONull(form.watch("valorMaximo"));

  const { setValue } = form;
  /**
   * Al cambiar de variable (o de ecuación) la meta anterior deja de tener
   * sentido: se reencuadra en el valor actual, que es de donde parte el
   * paciente. En edición no se toca lo que el profesional ya fijó.
   */
  useEffect(() => {
    if (editando) return;
    setValue("valorObjetivo", actual != null ? String(actual) : "");
    setValue("valorMinimo", "");
    setValue("valorMaximo", "");
  }, [variable, metodoGrasa, actual, editando, setValue]);

  const rango = rangoDelSlider(actual, definicion.min, definicion.max);
  const paso = pasoDe(definicion.min, definicion.max);
  const brecha =
    actual != null && valorNumero != null ? valorNumero - actual : null;
  const unidad = definicion.unidad ? ` ${definicion.unidad}` : "";

  /**
   * Lee los números de la meta según su tipo y marca el error en el campo
   * que está en pantalla. Null si alguno no sirve.
   */
  function leerMeta(datos: DatosFormulario): ValoresMeta | null {
    const fueraDeRango = `Entre ${definicion.min} y ${definicion.max}${unidad}`;
    const leer = (
      campo: "valorObjetivo" | "valorMinimo" | "valorMaximo",
      vacio: string,
    ): number | null => {
      const texto = datos[campo].trim();
      const valor = aNumeroONull(texto);
      if (valor == null) {
        form.setError(campo, {
          message: texto ? "Tiene que ser un número" : vacio,
        });
        return null;
      }
      if (valor < definicion.min || valor > definicion.max) {
        form.setError(campo, { message: fueraDeRango });
        return null;
      }
      return valor;
    };

    if (datos.tipoMeta === "VALOR") {
      const valor = leer("valorObjetivo", "Indicá el valor a alcanzar");
      return valor == null
        ? null
        : { valorObjetivo: valor, valorMinimo: null, valorMaximo: null };
    }

    const minimo = leer("valorMinimo", "Indicá el mínimo");
    const maximo = leer("valorMaximo", "Indicá el máximo");
    if (minimo == null || maximo == null) return null;
    if (minimo >= maximo) {
      form.setError("valorMaximo", {
        message: "Tiene que ser mayor que el mínimo",
      });
      return null;
    }
    return { valorObjetivo: null, valorMinimo: minimo, valorMaximo: maximo };
  }

  function alEnviar(datos: DatosFormulario) {
    const meta = leerMeta(datos);
    if (meta == null) return;

    guardarObjetivoComposicion.mutate(
      {
        pacienteId,
        variable: datos.variable,
        metodoGrasa: pideMetodo ? datos.metodoGrasa : null,
        ...meta,
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
                  {/* Agrupadas por forma de medir: en una lista plana de
                      diecisiete, "masa adiposa" (Kerr) y "masa grasa"
                      (pliegues) se eligen a ciegas, y son de modelos
                      distintos que no se comparan entre sí. */}
                  {porOrigen.map(({ origen, variables }) => (
                    <SelectGroup key={origen}>
                      <SelectLabel>
                        {ETIQUETAS_ORIGEN[origen].titulo}
                      </SelectLabel>
                      {variables.map((opcion) => (
                        <SelectItem key={opcion} value={opcion}>
                          {definicionVariable(opcion).etiqueta}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ETIQUETAS_ORIGEN[origenDeVariable(variable)].detalle}
              </p>
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
                    {metodosDelSelect.map((metodo) => {
                      const yaTiene = ocupada(variable, metodo);
                      return (
                        <SelectItem
                          key={metodo}
                          value={metodo}
                          disabled={yaTiene}
                        >
                          {DEFINICIONES_METODO[metodo].etiqueta}
                          {yaTiene && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (ya tiene meta)
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
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

        <FormField
          control={form.control}
          name="tipoMeta"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FormLabel>Tipo de meta</FormLabel>
                <div
                  className="flex rounded-lg border p-0.5"
                  role="radiogroup"
                  aria-label="Tipo de meta"
                >
                  {TIPOS_META.map((opcion) => (
                    <button
                      key={opcion.valor}
                      type="button"
                      role="radio"
                      aria-checked={field.value === opcion.valor}
                      onClick={() => {
                        field.onChange(opcion.valor);
                        form.clearErrors([
                          "valorObjetivo",
                          "valorMinimo",
                          "valorMaximo",
                        ]);
                      }}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        field.value === opcion.valor
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opcion.etiqueta}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {TIPOS_META.find((t) => t.valor === field.value)?.ayuda}
              </p>
            </FormItem>
          )}
        />

        {tipoMeta === "RANGO" ? (
          <BloqueRango
            actual={actual}
            minimo={minimoNumero}
            maximo={maximoNumero}
            definicion={definicion}
          >
            {(["valorMinimo", "valorMaximo"] as const).map((nombre) => (
              <FormField
                key={nombre}
                control={form.control}
                name={nombre}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      {nombre === "valorMinimo" ? "Mínimo" : "Máximo"}
                    </FormLabel>
                    <div className="flex items-center gap-1.5">
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          className="h-9 text-right font-semibold tabular-nums"
                          {...field}
                        />
                      </FormControl>
                      {definicion.unidad && (
                        <span className="text-sm text-muted-foreground">
                          {definicion.unidad}
                        </span>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </BloqueRango>
        ) : (
          /* La meta se fija moviéndose DESDE el valor de hoy, no escribiendo un
            número en el aire: así se ve la distancia que se está proponiendo. */
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
                          {formatearMedida(actual)}
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
                      {formatearMedida(rango.min)}
                    </span>
                    {brecha != null && Math.abs(brecha) > 1e-9 ? (
                      <span className="font-medium text-foreground">
                        {brecha > 0 ? "Subir" : "Bajar"}{" "}
                        <span className="tabular-nums">
                          {formatearMedida(Math.abs(brecha))}
                          {unidad}
                        </span>
                      </span>
                    ) : (
                      <span>Arrastrá o escribí el valor</span>
                    )}
                    <span className="tabular-nums">
                      {formatearMedida(rango.max)}
                    </span>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
 * La meta como rango: los dos campos (que llegan como `children`, porque son
 * del formulario) y, debajo, una barra con el rango y dónde está hoy el
 * paciente. Es la versión de rango del «moverse desde el valor de hoy»: se ve
 * si ya está adentro o cuánto le falta al borde más cercano.
 */
function BloqueRango({
  actual,
  minimo,
  maximo,
  definicion,
  children,
}: {
  actual: number | null;
  minimo: number | null;
  maximo: number | null;
  definicion: { min: number; max: number; unidad: string };
  children: ReactNode;
}) {
  const unidad = definicion.unidad ? ` ${definicion.unidad}` : "";
  const valido = minimo != null && maximo != null && minimo < maximo;

  // La escala de la barra: el mismo encuadre que el slider de un valor,
  // estirado para que entren los dos bordes que se escribieron.
  const base = rangoDelSlider(actual, definicion.min, definicion.max);
  const desde = Math.max(
    definicion.min,
    Math.min(base.min, minimo ?? base.min, maximo ?? base.min),
  );
  const hasta = Math.min(
    definicion.max,
    Math.max(base.max, minimo ?? base.max, maximo ?? base.max),
  );
  const posicion = (valor: number): number =>
    hasta > desde
      ? acotar(((valor - desde) / (hasta - desde)) * 100, { min: 0, max: 100 })
      : 0;

  let lectura: string;
  if (!valido) {
    lectura =
      minimo != null && maximo != null
        ? "El mínimo tiene que ser menor que el máximo"
        : "Escribí el mínimo y el máximo";
  } else if (actual == null) {
    lectura = "Sin medición para comparar";
  } else if (actual < minimo) {
    lectura = `Subir ${formatearMedida(minimo - actual)}${unidad} para entrar`;
  } else if (actual > maximo) {
    lectura = `Bajar ${formatearMedida(actual - maximo)}${unidad} para entrar`;
  } else {
    lectura = "Hoy ya está dentro del rango";
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm text-muted-foreground">
        {actual != null ? (
          <>
            Hoy{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatearMedida(actual)}
              {unidad}
            </span>
          </>
        ) : (
          <span className="text-xs">Sin medición para esta variable</span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3">{children}</div>

      <div className="space-y-1.5" aria-hidden>
        <div className="relative h-2.5 w-full rounded-full bg-muted">
          {valido && (
            <span
              className="absolute inset-y-0 rounded-full bg-primary/40"
              style={{
                left: `${posicion(minimo)}%`,
                width: `${posicion(maximo) - posicion(minimo)}%`,
              }}
            />
          )}
          {actual != null && (
            <span
              className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
              style={{ left: `${posicion(actual)}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>{formatearMedida(desde)}</span>
          <span>{formatearMedida(hasta)}</span>
        </div>
      </div>
      <p className="text-center text-[11px] font-medium">{lectura}</p>
    </div>
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

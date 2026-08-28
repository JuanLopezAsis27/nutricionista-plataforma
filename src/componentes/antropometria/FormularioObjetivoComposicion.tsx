"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ObjetivoComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  VARIABLES_COMPOSICION,
  definicionVariable,
  exigeMetodoGrasa,
  type VariableComposicion,
} from "@/dominio/entidades/ObjetivoComposicion";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
  type MetodoGrasa,
} from "@/dominio/servicios/grasaPorPliegues";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { aFechaISO } from "@/lib/formato";
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

const esquema = z.object({
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
  onTerminado: () => void;
}

/** Alta y edición de una meta de composición corporal. */
export function FormularioObjetivoComposicion({
  pacienteId,
  objetivoInicial,
  variablesOcupadas,
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
  const definicion = definicionVariable(variable);
  // Las variables de grasa dependen de la ecuación: sin fijar una, la serie
  // saltaría de fórmula entre consultas y el progreso sería un artefacto.
  const pideMetodo = exigeMetodoGrasa(variable);

  function alEnviar(datos: DatosFormulario) {
    const valor = Number(datos.valorObjetivo.trim().replace(",", "."));
    if (!Number.isFinite(valor)) {
      form.setError("valorObjetivo", { message: "Tiene que ser un número" });
      return;
    }
    if (valor < definicion.min || valor > definicion.max) {
      form.setError("valorObjetivo", {
        message: `Entre ${definicion.min} y ${definicion.max}${
          definicion.unidad ? ` ${definicion.unidad}` : ""
        }`,
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
                    : `${DEFINICIONES_METODO[field.value as MetodoGrasa].poblacion}. Toda la serie va a usar esta ecuación.`}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="valorObjetivo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Valor a alcanzar
                  {definicion.unidad ? ` (${definicion.unidad})` : ""}
                </FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="—" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Entre {definicion.min} y {definicion.max}.
                </p>
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
        </div>

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

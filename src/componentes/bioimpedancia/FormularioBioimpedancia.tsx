"use client";

import { useForm } from "react-hook-form";
import type { MedicionBioimpedanciaDto } from "@/aplicacion/dtos/bioimpedancia.dto";
import {
  RANGOS_BIOIMPEDANCIA,
  describirRangoBioimpedancia,
  type MedidasBioimpedancia,
} from "@/dominio/entidades/Bioimpedancia";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { aFechaISO, hoyISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";

type Campo = keyof MedidasBioimpedancia;

/**
 * Los campos en el orden en que los muestra la balanza: el peso arriba, y
 * después cada tejido en kg y en % uno al lado del otro. La grasa visceral va
 * al final y sin unidad: es un nivel de la escala del equipo.
 */
const CAMPOS: { nombre: Campo; etiqueta: string }[] = [
  { nombre: "pesoKg", etiqueta: "Peso (kg) *" },
  { nombre: "masaMuscularKg", etiqueta: "Músculo (kg)" },
  { nombre: "porcentajeMuscular", etiqueta: "Músculo (%)" },
  { nombre: "masaGrasaKg", etiqueta: "Grasa (kg)" },
  { nombre: "porcentajeGrasa", etiqueta: "Grasa (%)" },
  { nombre: "nivelGrasaVisceral", etiqueta: "Grasa visceral (nivel)" },
];

type DatosFormulario = Record<Campo, string> & {
  fecha: string;
  observaciones: string;
};

/**
 * Alta y edición de una medición de bioimpedancia. Los valores se anotan tal
 * como los informa el equipo; nada se calcula acá.
 */
export function FormularioBioimpedancia({
  pacienteId,
  medicionInicial,
  onTerminado,
}: {
  pacienteId: string;
  medicionInicial: MedicionBioimpedanciaDto | null;
  onTerminado: () => void;
}) {
  const { registrarBioimpedancia, actualizarBioimpedancia } = useEvaluacion();

  const form = useForm<DatosFormulario>({
    defaultValues: {
      fecha: medicionInicial ? aFechaISO(medicionInicial.fecha) : hoyISO(),
      observaciones: medicionInicial?.observaciones ?? "",
      ...(Object.fromEntries(
        CAMPOS.map(({ nombre }) => [nombre, aTexto(medicionInicial?.[nombre])]),
      ) as Record<Campo, string>),
    },
  });

  const enviando =
    registrarBioimpedancia.isPending || actualizarBioimpedancia.isPending;

  function alEnviar(datos: DatosFormulario) {
    // El rango se revisa acá para poder decir QUÉ campo está mal al lado del
    // campo; la regla es la misma que aplica la entidad al guardar.
    let hayError = false;
    const valores = {} as Record<Campo, number | null>;
    for (const { nombre } of CAMPOS) {
      const texto = datos[nombre].trim();
      const valor = aNumeroONull(texto);
      const rango = RANGOS_BIOIMPEDANCIA[nombre];
      if (texto !== "" && valor == null) {
        form.setError(nombre, { message: "No es un número" });
        hayError = true;
      } else if (valor != null && (valor < rango.min || valor > rango.max)) {
        const descripcion = describirRangoBioimpedancia(rango);
        form.setError(nombre, {
          message: descripcion.charAt(0).toUpperCase() + descripcion.slice(1),
        });
        hayError = true;
      } else if (valor != null && rango.entero && !Number.isInteger(valor)) {
        form.setError(nombre, { message: "Es un nivel: sin decimales" });
        hayError = true;
      }
      valores[nombre] = valor;
    }
    if (datos.pesoKg.trim() === "") {
      form.setError("pesoKg", { message: "El peso es obligatorio" });
      hayError = true;
    }
    if (hayError || valores.pesoKg == null) return;

    const base = {
      fecha: new Date(datos.fecha),
      ...valores,
      pesoKg: valores.pesoKg,
      observaciones: datos.observaciones.trim() || null,
    };

    if (medicionInicial) {
      actualizarBioimpedancia.mutate(
        { id: medicionInicial.id, ...base },
        { onSuccess: onTerminado },
      );
    } else {
      registrarBioimpedancia.mutate(
        { pacienteId, ...base },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="bia-fecha" className="text-xs">
            Fecha de consulta
          </Label>
          <Input id="bia-fecha" type="date" {...form.register("fecha")} />
        </div>
        {CAMPOS.map(({ nombre, etiqueta }) => {
          const error = form.formState.errors[nombre];
          return (
            <div key={nombre} className="space-y-1">
              <Label htmlFor={`bia-${nombre}`} className="text-xs">
                {etiqueta}
              </Label>
              <Input
                id={`bia-${nombre}`}
                inputMode={
                  RANGOS_BIOIMPEDANCIA[nombre].entero ? "numeric" : "decimal"
                }
                placeholder="—"
                aria-invalid={error ? true : undefined}
                {...form.register(nombre)}
              />
              {error && (
                <p className="text-[11px] text-destructive">{error.message}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <Label htmlFor="bia-observaciones" className="text-xs">
          Observaciones
        </Label>
        <Textarea
          id="bia-observaciones"
          rows={3}
          placeholder="Equipo, hidratación, ayuno, hora del día…"
          {...form.register("observaciones")}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={enviando}>
          {enviando
            ? "Guardando…"
            : medicionInicial
              ? "Guardar cambios"
              : "Registrar medición"}
        </Button>
      </div>
    </form>
  );
}

function aTexto(valor: number | null | undefined): string {
  return valor == null ? "" : String(valor);
}

/** "" → null; "12,5" o "12.5" → 12,5 (acepta coma decimal). */
function aNumeroONull(valor: string): number | null {
  const limpio = valor.trim().replace(",", ".");
  if (limpio === "") return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

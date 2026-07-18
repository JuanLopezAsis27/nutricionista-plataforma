"use client";

import { useForm } from "react-hook-form";
import type { MedicionEvolucionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { aFechaISO, hoyISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";

interface PropsFormulario {
  pacienteId: string;
  /** Si se pasa, el formulario edita esa medición; si no, crea una nueva. */
  medicionInicial?: MedicionEvolucionDto | null;
  onTerminado: () => void;
}

/** Campos numéricos del formulario (como strings; se convierten al enviar). */
const PLIEGUES = [
  { nombre: "pliegueTricipital", etiqueta: "Tricipital" },
  { nombre: "pliegueSubescapular", etiqueta: "Subescapular" },
  { nombre: "pliegueSupraespinal", etiqueta: "Supraespinal" },
  { nombre: "pliegueAbdominal", etiqueta: "Abdominal" },
  { nombre: "pliegueMuslo", etiqueta: "Muslo" },
  { nombre: "plieguePantorrilla", etiqueta: "Pantorrilla" },
  { nombre: "pliegueBicipital", etiqueta: "Bicipital" },
  { nombre: "pliegueCrestaIliaca", etiqueta: "Cresta ilíaca" },
] as const;

const CIRCUNFERENCIAS = [
  { nombre: "circTorax", etiqueta: "Tórax" },
  { nombre: "circCinturaMinima", etiqueta: "Cintura mínima" },
  { nombre: "circCinturaMaxima", etiqueta: "Cintura máxima" },
  { nombre: "circCadera", etiqueta: "Cadera" },
  { nombre: "circBrazo", etiqueta: "Brazo" },
  { nombre: "circBrazoContraido", etiqueta: "Brazo contraído" },
] as const;

type CampoMedida =
  | (typeof PLIEGUES)[number]["nombre"]
  | (typeof CIRCUNFERENCIAS)[number]["nombre"];

type DatosFormulario = {
  fecha: string;
  pesoKg: string;
  tallaCm: string;
  kgGrasa: string;
  observaciones: string;
} & Record<CampoMedida, string>;

/** "" → null; "12,5" o "12.5" → 12.5 (acepta coma decimal, como la planilla). */
function aNumeroONull(valor: string): number | null {
  const limpio = valor.trim().replace(",", ".");
  if (limpio === "") return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Formulario de medición antropométrica, pensado para carga rápida en
 * consulta: grupos Pliegues / Circunferencias con tabulación secuencial.
 */
export function FormularioAntropometria({
  pacienteId,
  medicionInicial,
  onTerminado,
}: PropsFormulario) {
  const { registrarAntropometria, actualizarAntropometria } = useEvaluacion();
  const editando = Boolean(medicionInicial);

  const aTexto = (v: number | null | undefined): string => (v == null ? "" : String(v));

  const form = useForm<DatosFormulario>({
    defaultValues: {
      fecha: medicionInicial ? aFechaISO(medicionInicial.fecha) : hoyISO(),
      pesoKg: aTexto(medicionInicial?.pesoKg),
      tallaCm: aTexto(medicionInicial?.tallaCm),
      kgGrasa: aTexto(medicionInicial?.kgGrasa),
      observaciones: medicionInicial?.observaciones ?? "",
      ...(Object.fromEntries(
        [...PLIEGUES, ...CIRCUNFERENCIAS].map((campo) => [
          campo.nombre,
          aTexto(medicionInicial?.[campo.nombre]),
        ]),
      ) as Record<CampoMedida, string>),
    },
  });

  const enviando = registrarAntropometria.isPending || actualizarAntropometria.isPending;

  function alEnviar(datos: DatosFormulario) {
    const peso = aNumeroONull(datos.pesoKg);
    if (peso == null) {
      form.setError("pesoKg", { message: "El peso es obligatorio" });
      return;
    }

    const medidas = Object.fromEntries(
      [...PLIEGUES, ...CIRCUNFERENCIAS].map((campo) => [
        campo.nombre,
        aNumeroONull(datos[campo.nombre]),
      ]),
    );

    const base = {
      fecha: new Date(datos.fecha),
      pesoKg: peso,
      tallaCm: aNumeroONull(datos.tallaCm),
      kgGrasa: aNumeroONull(datos.kgGrasa),
      observaciones: datos.observaciones.trim() || null,
      ...medidas,
    };

    if (medicionInicial) {
      actualizarAntropometria.mutate(
        { id: medicionInicial.id, ...base },
        { onSuccess: onTerminado },
      );
    } else {
      registrarAntropometria.mutate(
        { pacienteId, ...base },
        { onSuccess: onTerminado },
      );
    }
  }

  const campoNumerico = (nombre: keyof DatosFormulario, etiqueta: string) => (
    <div key={nombre} className="space-y-1">
      <Label htmlFor={nombre} className="text-xs">
        {etiqueta}
      </Label>
      <Input
        id={nombre}
        inputMode="decimal"
        placeholder="—"
        {...form.register(nombre)}
      />
    </div>
  );

  return (
    <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="fecha" className="text-xs">
            Fecha de consulta
          </Label>
          <Input id="fecha" type="date" {...form.register("fecha")} />
        </div>
        {campoNumerico("pesoKg", "Peso (kg) *")}
        {campoNumerico("tallaCm", "Talla (cm)")}
        {campoNumerico("kgGrasa", "Kg grasa")}
      </div>
      {form.formState.errors.pesoKg && (
        <p className="text-sm text-destructive">
          {form.formState.errors.pesoKg.message}
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Pliegues (mm)</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PLIEGUES.map((campo) => campoNumerico(campo.nombre, campo.etiqueta))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Circunferencias (cm)</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CIRCUNFERENCIAS.map((campo) => campoNumerico(campo.nombre, campo.etiqueta))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="observaciones" className="text-xs">
          Observaciones
        </Label>
        <Textarea id="observaciones" rows={2} {...form.register("observaciones")} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onTerminado} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar medición"}
        </Button>
      </div>
    </form>
  );
}

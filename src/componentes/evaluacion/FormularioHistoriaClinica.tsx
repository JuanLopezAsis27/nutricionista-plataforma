"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { formatearFecha } from "@/lib/formato";

const CAMPOS = [
  { nombre: "motivoConsulta", etiqueta: "Motivo de consulta" },
  { nombre: "diagnosticos", etiqueta: "Diagnósticos" },
  { nombre: "medicacion", etiqueta: "Medicación" },
  { nombre: "antecedentesPersonales", etiqueta: "Antecedentes personales" },
  { nombre: "antecedentesFamiliares", etiqueta: "Antecedentes familiares" },
  { nombre: "habitos", etiqueta: "Hábitos (actividad, sueño, consumo)" },
  { nombre: "contexto", etiqueta: "Contexto (trabajo, horarios, entorno)" },
] as const;

type NombreCampo = (typeof CAMPOS)[number]["nombre"];
type DatosFormulario = Record<NombreCampo, string>;

/** Formulario de historia clínica del paciente (upsert de los 7 campos). */
export function FormularioHistoriaClinica({
  pacienteId,
}: {
  pacienteId: string;
}) {
  const { obtenerHistoria, guardarHistoria } = useEvaluacion();
  const historia = obtenerHistoria({ pacienteId });

  const form = useForm<DatosFormulario>({
    defaultValues: Object.fromEntries(
      CAMPOS.map((c) => [c.nombre, ""]),
    ) as DatosFormulario,
  });

  // Carga los valores cuando llega la historia (o cambia el paciente).
  useEffect(() => {
    if (historia.data) {
      form.reset(
        Object.fromEntries(
          CAMPOS.map((c) => [c.nombre, historia.data?.[c.nombre] ?? ""]),
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al llegar datos
  }, [historia.data]);

  if (historia.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  function alEnviar(datos: DatosFormulario) {
    guardarHistoria.mutate({
      pacienteId,
      ...Object.fromEntries(
        CAMPOS.map((c) => [c.nombre, datos[c.nombre].trim() || null]),
      ),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Historia clínica</h3>
        {historia.data && (
          <span className="text-xs text-muted-foreground">
            Última actualización: {formatearFecha(historia.data.actualizadoEn)}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.map((campo) => (
          <div key={campo.nombre} className="space-y-2">
            <Label htmlFor={campo.nombre}>{campo.etiqueta}</Label>
            <Textarea
              id={campo.nombre}
              rows={3}
              {...form.register(campo.nombre)}
              placeholder="—"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={guardarHistoria.isPending}>
          {guardarHistoria.isPending
            ? "Guardando…"
            : "Guardar historia clínica"}
        </Button>
      </div>
    </form>
  );
}

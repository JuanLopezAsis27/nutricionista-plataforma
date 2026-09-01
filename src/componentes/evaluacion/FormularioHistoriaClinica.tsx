"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
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
  const { obtenerHistoria, guardarHistoria, interpretarHistoriaDesdeArchivo } =
    useEvaluacion();
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

  // Sube la foto del documento y precarga el formulario con lo que la IA
  // pudo leer. No guarda nada solo: el profesional revisa y aprieta "Guardar".
  function alSubirDocumento(archivo: { id: string }) {
    interpretarHistoriaDesdeArchivo.mutate(
      { pacienteId, archivoId: archivo.id },
      {
        onSuccess: (sugerido) => {
          let algunCampo = false;
          for (const campo of CAMPOS) {
            const valor = sugerido[campo.nombre];
            if (valor) {
              form.setValue(campo.nombre, valor);
              algunCampo = true;
            }
          }
          toast[algunCampo ? "success" : "info"](
            algunCampo
              ? "Campos sugeridos por IA. Revisalos antes de guardar."
              : "La IA no encontró datos para completar en la imagen.",
          );
        },
      },
    );
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

      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Subir documento</p>
        <p className="text-xs text-muted-foreground">
          Subí el documento de historia clínica: una foto (JPG, PNG, WEBP), un
          PDF o un Word. Queda guardado en la ficha del paciente y, si es una
          foto o un PDF, la IA además sugiere los campos de abajo (no se guarda
          nada solo: revisá y apretá &quot;Guardar historia clínica&quot;). Los
          Word no se pueden leer automáticamente.
        </p>
        <SubidorArchivo
          contexto="paciente"
          pacienteId={pacienteId}
          accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          sinVistaPrevia
          onSubido={alSubirDocumento}
        />
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

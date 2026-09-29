"use client";

import { Scale } from "lucide-react";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { Skeleton } from "@/componentes/ui/skeleton";
import { DashboardBioimpedancia } from "./DashboardBioimpedancia";

/**
 * Portal del paciente: el dashboard de su bioimpedancia, en lectura.
 *
 * Es el MISMO dashboard que ve el profesional en la ficha —peso, músculo,
 * grasa y visceral, con su evolución—, sobre `miBioimpedancia`, que resuelve
 * al paciente desde la sesión y no trae las observaciones del profesional.
 * Va aparte de la antropometría porque es otra fuente: el % graso de la
 * balanza y el de una ecuación no se comparan (`docs/BIOIMPEDANCIA.md`).
 */
export function BioimpedanciaPaciente() {
  const { miBioimpedancia } = useEvaluacion();
  const consulta = miBioimpedancia();

  if (consulta.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (consulta.isError || !consulta.data) {
    return (
      <p className="text-sm text-muted-foreground">
        No pudimos cargar tus mediciones. Probá de nuevo en un rato.
      </p>
    );
  }

  // El vacío se dice acá y no en el dashboard: el suyo le habla al
  // profesional («Cargá una con Nueva medición»).
  if (consulta.data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Scale className="h-6 w-6 text-primary" />
        </span>
        <p className="pt-3 text-sm text-muted-foreground">
          Todavía no tenés mediciones de bioimpedancia. Cuando tu nutricionista
          te mida con la balanza, acá vas a ver tu peso, tu músculo y tu grasa,
          y cómo cambian.
        </p>
      </div>
    );
  }

  return <DashboardBioimpedancia mediciones={consulta.data} />;
}

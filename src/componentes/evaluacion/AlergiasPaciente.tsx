"use client";

import { AlertTriangle } from "lucide-react";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";

/**
 * Alergias e intolerancias SIEMPRE visibles en el encabezado de la ficha del
 * paciente, para que ninguna decisión nutricional las pase por alto.
 *
 * Muestra el texto de `alergiasIntolerancias` de la historia clínica, que es
 * la única fuente desde la migración 68: antes eran badges de la tabla
 * `alertas_alimentarias`, que se quitó cuando las alergias pasaron a cargarse
 * como texto libre. Comparte la consulta con el formulario de la historia, así
 * que se actualiza sola al guardarla.
 */
export function AlergiasPaciente({ pacienteId }: { pacienteId: string }) {
  const { obtenerHistoria } = useEvaluacion();
  const historia = obtenerHistoria({ pacienteId });

  const texto = historia.data?.alergiasIntolerancias?.trim();
  if (!texto) return null;

  return (
    <p
      className="inline-flex max-w-prose items-start gap-1.5 rounded-lg border border-orange-200 bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300"
      title={texto}
    >
      <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
      <span className="line-clamp-2">Alergias e intolerancias: {texto}</span>
    </p>
  );
}

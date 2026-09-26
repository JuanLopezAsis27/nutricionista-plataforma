"use client";

import { Users } from "lucide-react";
import { useRevisionEmail } from "@/lib/hooks/useRevisionEmail";

/**
 * Aviso debajo del email de contacto de un paciente cuando otra ficha del
 * consultorio ya lo tiene (migración 79).
 *
 * Repetirlo está permitido —dos hermanos con el email de la madre—, pero
 * repetido por ERROR (un tipeo, el email de otra persona) manda los avisos de
 * este paciente a un tercero. Nombrar la otra ficha es lo que deja ver cuál de
 * los dos casos es.
 */
export function AvisoEmailRepetido({
  email,
  pacienteId,
}: {
  email: string | undefined;
  /** Al editar: la propia ficha no cuenta. */
  pacienteId?: string;
}) {
  const revision = useRevisionEmail(email, pacienteId);
  const otras = revision?.otrasFichas ?? [];
  if (otras.length === 0) return null;

  return (
    <p className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Este email ya lo tiene{" "}
        <strong>{otras.map((o) => o.nombre).join(", ")}</strong>. Si es un
        familiar, está bien: los avisos de los dos llegan a esa casilla. Si no,
        revisá que esté bien escrito.
      </span>
    </p>
  );
}

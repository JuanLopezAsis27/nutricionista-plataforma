"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useIA } from "@/lib/hooks/useIA";
import { cn } from "@/lib/utilidades";
import type { InsightPacienteDto } from "@/aplicacion/dtos/ia.dto";

/**
 * Voto 👍/👎 sobre un insight predictivo (loop de feedback). Solo aparece en los
 * insights reales de un paciente (los de demostración no tienen `pacienteId`).
 * El voto se guarda como etiqueta para entrenar los modelos a futuro.
 */
export function FeedbackInsight({ insight }: { insight: InsightPacienteDto }) {
  const { feedbackInsight } = useIA();
  const [votado, setVotado] = useState<"util" | "no" | null>(null);

  if (!insight.pacienteId) return null;

  function votar(util: boolean) {
    if (votado) return;
    setVotado(util ? "util" : "no");
    feedbackInsight.mutate({
      pacienteId: insight.pacienteId as string,
      tipoInsight: insight.tipo,
      util,
      detalle: insight.detalle,
    });
  }

  if (votado) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-primary" />
        ¡Gracias! Tu corrección ayuda a mejorar los análisis.
      </p>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-xs text-muted-foreground">¿Te resultó útil?</span>
      <button
        type="button"
        onClick={() => votar(true)}
        aria-label="Útil"
        className={cn(
          "rounded-md border p-1.5 text-muted-foreground",
          "hover:border-primary hover:text-primary",
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => votar(false)}
        aria-label="No fue útil"
        className={cn(
          "rounded-md border p-1.5 text-muted-foreground",
          "hover:border-destructive hover:text-destructive",
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

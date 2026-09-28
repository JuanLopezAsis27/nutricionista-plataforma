"use client";

import { cn } from "@/lib/utilidades";

/**
 * Los chips para filtrar recetas por etiqueta («vegetariano», «sin TACC»…).
 * Una sola a la vez: tocar la elegida la suelta. Sin etiquetas no dibuja nada.
 *
 * Lo comparten el recetario del consultorio y el catálogo de la plataforma,
 * para que las dos listas se filtren igual.
 */
export function FiltroEtiquetas({
  etiquetas,
  elegida,
  onElegir,
}: {
  etiquetas: string[];
  elegida: string | null;
  onElegir: (etiqueta: string | null) => void;
}) {
  if (etiquetas.length === 0) return null;
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Filtrar por etiqueta"
    >
      {etiquetas.map((etiqueta) => {
        const activa = etiqueta === elegida;
        return (
          <button
            key={etiqueta}
            type="button"
            aria-pressed={activa}
            onClick={() => onElegir(activa ? null : etiqueta)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              activa
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}

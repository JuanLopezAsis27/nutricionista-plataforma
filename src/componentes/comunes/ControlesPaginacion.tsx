"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/componentes/ui/button";

/**
 * Controles de paginación reutilizables (anterior / siguiente + indicador).
 * Para grillas de tarjetas; el componente `TablaDatos` ya trae los suyos.
 * No renderiza nada si hay una sola página.
 */
export function ControlesPaginacion({
  pagina,
  totalPaginas,
  onCambiar,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <span className="text-sm text-muted-foreground">
        Página {pagina} de {totalPaginas}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= totalPaginas}
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

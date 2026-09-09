"use client";

import { FileText, X } from "lucide-react";
import type { ArchivoDelPlanDto } from "@/aplicacion/dtos/plan.dto";
import { Button } from "@/componentes/ui/button";
import { formatearTamano } from "@/lib/formato";

/** Fila de un archivo ya vinculado, con el botón de quitarlo. */
export function FilaArchivo({
  archivo,
  etiquetaQuitar,
  onQuitar,
}: {
  archivo: ArchivoDelPlanDto;
  etiquetaQuitar: string;
  onQuitar: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm">
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{archivo.nombreOriginal}</p>
        <p className="text-xs text-muted-foreground">
          {formatearTamano(archivo.tamanoBytes)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={etiquetaQuitar}
        onClick={onQuitar}
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

/**
 * El subidor devuelve más campos de los que el plan necesita. Recortarlo acá
 * evita que la clave de almacenamiento y el resto de la fila de Archivo viajen
 * al estado del formulario.
 */
export function aFichaArchivo(archivo: {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
}): ArchivoDelPlanDto {
  return {
    id: archivo.id,
    nombreOriginal: archivo.nombreOriginal,
    mimeType: archivo.mimeType,
    tamanoBytes: archivo.tamanoBytes,
  };
}

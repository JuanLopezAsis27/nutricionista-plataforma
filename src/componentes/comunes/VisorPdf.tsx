"use client";

import { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utilidades";

interface PropsVisorPdf {
  /** Id del Archivo. El contenido se sirve por /api/archivos/<id>/ver. */
  archivoId: string;
  titulo?: string;
  /** Alto del visor. Por defecto ocupa la pantalla sin obligar a hacer scroll. */
  className?: string;
}

/**
 * Visor de PDF embebido, del mismo origen que la página.
 *
 * Apunta a `/api/archivos/<id>/ver` y no a la URL firmada del bucket: esa es de
 * otro origen y el iframe queda a merced de sus cabeceras. Con la ruta propia
 * el PDF sale con `Content-Disposition: inline` y la sesión ya está validada.
 *
 * El botón de "Abrir en una pestaña" no es decorativo: es la salida cuando el
 * navegador no puede dibujar PDFs embebidos —pasa en el WebView de Android, que
 * no trae visor de PDF—, y ahí el sistema lo abre con la app que corresponda.
 */
export function VisorPdf({
  archivoId,
  titulo = "Plan en PDF",
  className,
}: PropsVisorPdf) {
  const [fallo, setFallo] = useState(false);
  const url = `/api/archivos/${archivoId}/ver`;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {titulo}
        </p>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Abrir en una pestaña
          </a>
        </Button>
      </div>

      {fallo ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Este dispositivo no puede mostrar el PDF acá adentro. Abrilo en una
          pestaña con el botón de arriba.
        </p>
      ) : (
        <iframe
          src={url}
          title={titulo}
          onError={() => setFallo(true)}
          className="h-[70vh] min-h-96 w-full rounded-lg border bg-muted"
        />
      )}
    </div>
  );
}

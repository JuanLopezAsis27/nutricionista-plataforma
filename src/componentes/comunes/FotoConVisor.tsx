"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";
import { cn } from "@/lib/utilidades";

interface PropsFotoConVisor {
  /** Id del Archivo. El contenido se sirve por /api/archivos/<id>/ver. */
  archivoId: string;
  alt: string;
  /** Clases de la miniatura (tamaño, radio, etc). */
  className?: string;
  /**
   * Contenido opcional al lado de la miniatura (nombre, fecha) que forma parte
   * del mismo disparador: en una lista de archivos, tocar la fila entera abre
   * la foto, no solo el cuadradito.
   */
  children?: ReactNode;
}

/**
 * Miniatura de una foto que, al tocarla, se abre en grande DENTRO de la app
 * (un diálogo) en vez de una pestaña nueva del navegador.
 */
export function FotoConVisor({
  archivoId,
  alt,
  className,
  children,
}: PropsFotoConVisor) {
  const [abierta, setAbierta] = useState(false);
  const url = `/api/archivos/${archivoId}/ver`;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ver ${alt} en grande`}
        className={cn(
          "block",
          children && "flex min-w-0 flex-1 items-center gap-3 text-left",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ruta dinámica autorizada, no optimizable */}
        <img
          src={url}
          alt={alt}
          className={cn("rounded-md object-cover", className)}
        />
        {children}
      </button>

      <Dialog open={abierta} onOpenChange={setAbierta}>
        <DialogContent className="flex max-w-3xl items-center justify-center border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- ruta dinámica autorizada, no optimizable */}
          <img
            src={url}
            alt={alt}
            className="max-h-[85vh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

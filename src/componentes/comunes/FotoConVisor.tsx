"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";
import { cn } from "@/lib/utilidades";

interface PropsFotoConVisor {
  /** Id del Archivo. El contenido se sirve por /api/archivos/<id>/ver. */
  archivoId: string;
  alt: string;
  /** Clases de la miniatura (tamaño, radio, etc). */
  className?: string;
}

/**
 * Miniatura de una foto que, al tocarla, se abre en grande DENTRO de la app
 * (un diálogo) en vez de una pestaña nueva del navegador.
 */
export function FotoConVisor({ archivoId, alt, className }: PropsFotoConVisor) {
  const [abierta, setAbierta] = useState(false);
  const url = `/api/archivos/${archivoId}/ver`;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ver ${alt} en grande`}
        className="block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ruta dinámica autorizada, no optimizable */}
        <img
          src={url}
          alt={alt}
          className={cn("rounded-md object-cover", className)}
        />
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

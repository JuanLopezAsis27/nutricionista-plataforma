"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import { esDocumentoWord } from "@/dominio/entidades/Archivo";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utilidades";
import { rutaParaLeer } from "./rutaParaLeer";

interface PropsVisorArchivo {
  /** El archivo a mostrar: un PDF o un documento de Word. */
  archivo: { id: string; mimeType: string };
  titulo?: string;
  /** Alto del visor. Por defecto ocupa la pantalla sin obligar a hacer scroll. */
  className?: string;
}

/**
 * Visor embebido de un archivo del plan —PDF o Word—, del mismo origen que la
 * página.
 *
 * Apunta a rutas propias y no a la URL firmada del bucket: esa es de otro
 * origen y el iframe queda a merced de sus cabeceras. Con la ruta propia el
 * archivo sale en línea y la sesión ya está validada.
 *
 * El Word se muestra convertido a HTML, que no conserva la maquetación
 * (fuentes, colores): por eso lleva además el botón para bajar el original. Y
 * su iframe va con `sandbox`, que al PDF no se le puede poner porque el visor
 * del navegador deja de dibujar.
 *
 * El botón de "Abrir en una pestaña" no es decorativo: es la salida cuando el
 * navegador no puede dibujar PDFs embebidos —pasa en el WebView de Android, que
 * no trae visor de PDF—, y ahí el sistema lo abre con la app que corresponda.
 */
export function VisorArchivo({
  archivo,
  titulo = "Plan",
  className,
}: PropsVisorArchivo) {
  const [fallo, setFallo] = useState(false);
  const esWord = esDocumentoWord(archivo.mimeType);
  const url = rutaParaLeer(archivo);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {titulo}
        </p>
        <div className="flex flex-wrap gap-2">
          {esWord && (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/archivos/${archivo.id}`}>
                <Download className="h-4 w-4" />
                Descargar el Word
              </a>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Abrir en una pestaña
            </a>
          </Button>
        </div>
      </div>

      {fallo ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Este dispositivo no puede mostrar el archivo acá adentro. Abrilo en
          una pestaña con el botón de arriba.
        </p>
      ) : (
        <iframe
          src={url}
          title={titulo}
          sandbox={esWord ? "" : undefined}
          onError={() => setFallo(true)}
          className="h-[70vh] min-h-96 w-full rounded-lg border bg-muted"
        />
      )}
    </div>
  );
}

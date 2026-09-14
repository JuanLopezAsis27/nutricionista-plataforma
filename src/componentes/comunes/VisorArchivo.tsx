"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import { esDocumentoWord } from "@/dominio/entidades/Archivo";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utilidades";
import { rutaParaLeer } from "./rutaParaLeer";
import { useNavegadorDibujaPdf } from "./soportePdf";

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
 * ## El PDF que "no se veía" en algunos celulares
 *
 * Chrome en Android —y el WebView donde corre la app de la tienda— **no traen
 * visor de PDF embebido**. El iframe no quedaba vacío: mostraba el cartel de
 * error del navegador adentro del plan, sin ninguna salida a la vista salvo un
 * botón chico arriba a la derecha.
 *
 * Ahora se pregunta ANTES de embeber (`useNavegadorDibujaPdf`) y, cuando la
 * respuesta es que no, en lugar del iframe roto va el archivo ofrecido para
 * abrir o guardar, con los botones grandes y el motivo dicho. Preguntar es la
 * única manera: el `onError` del iframe no sirve —se dispara si no carga el
 * FRAME, y el frame carga bien; lo que falla es el visor de adentro, que no
 * avisa—, así que el estado de fallo que había acá no se activaba nunca.
 */
export function VisorArchivo({
  archivo,
  titulo = "Plan",
  className,
}: PropsVisorArchivo) {
  const esWord = esDocumentoWord(archivo.mimeType);
  const dibujaPdf = useNavegadorDibujaPdf();
  const url = rutaParaLeer(archivo);
  const urlDescarga = `/api/archivos/${archivo.id}`;

  // El Word no depende del visor de PDF: se sirve ya convertido a HTML.
  const sePuedeEmbeber = esWord || dibujaPdf;

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
              <a href={urlDescarga}>
                <Download className="h-4 w-4" />
                Descargar el Word
              </a>
            </Button>
          )}
          {sePuedeEmbeber && (
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir en una pestaña
              </a>
            </Button>
          )}
        </div>
      </div>

      {sePuedeEmbeber ? (
        <iframe
          src={url}
          title={titulo}
          sandbox={esWord ? "" : undefined}
          className="h-[70vh] min-h-96 w-full rounded-lg border bg-muted"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Tu teléfono no puede mostrar el PDF acá adentro. Abrilo y se ve
            completo, con la app de archivos que ya tenés.
          </p>
          <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir el PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={urlDescarga}>
                <Download className="h-4 w-4" />
                Descargar
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

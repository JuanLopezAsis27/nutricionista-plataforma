"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { useSubirArchivo, type DatosSubida } from "@/lib/hooks/useSubirArchivo";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";

interface PropsSubidor {
  /** Contexto de subida (define tipos permitidos y prefijo en el bucket). */
  contexto: DatosSubida["contexto"];
  /** Se invoca con los metadatos del archivo ya subido. */
  onSubido: (archivo: ArchivoSalidaDto) => void;
  /** Atributo accept del input (ej: "image/*,.pdf"). */
  accept?: string;
  titulo?: string;
  categoria?: string;
  /** Vincula el archivo directamente a un paciente (ficha → Archivos). */
  pacienteId?: string;
  className?: string;
}

/**
 * Zona de subida de archivos con arrastrar-y-soltar y vista previa.
 * Sube inmediatamente al soltar/elegir y notifica con onSubido.
 */
export function SubidorArchivo({
  contexto,
  onSubido,
  accept,
  titulo,
  categoria,
  pacienteId,
  className,
}: PropsSubidor) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { subir, subiendo } = useSubirArchivo();
  const [arrastrando, setArrastrando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<{
    nombre: string;
    url: string | null;
  } | null>(null);

  async function manejarArchivo(archivo: File) {
    setVistaPrevia({
      nombre: archivo.name,
      url: archivo.type.startsWith("image/")
        ? URL.createObjectURL(archivo)
        : null,
    });
    try {
      const subido = await subir(archivo, {
        contexto,
        titulo,
        categoria,
        pacienteId,
      });
      onSubido(subido);
      toast.success(`"${archivo.name}" subido correctamente.`);
    } catch (error) {
      setVistaPrevia(null);
      toast.error(
        error instanceof Error ? error.message : "No se pudo subir el archivo.",
      );
    }
  }

  function alSoltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastrando(false);
    const archivo = evento.dataTransfer.files[0];
    if (archivo) void manejarArchivo(archivo);
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Subir archivo"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          arrastrando
            ? "border-primary bg-accent"
            : "border-input hover:border-primary/50",
        )}
      >
        {subiendo ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          Arrastrá un archivo o hacé clic para elegirlo
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) void manejarArchivo(archivo);
            e.target.value = "";
          }}
        />
      </div>

      {vistaPrevia && (
        <div className="mt-3 flex items-center gap-3 rounded-md border bg-card p-2">
          {vistaPrevia.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no optimizable
            <img
              src={vistaPrevia.url}
              alt={`Vista previa de ${vistaPrevia.nombre}`}
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="flex-1 truncate text-sm">{vistaPrevia.nombre}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Quitar vista previa"
            onClick={() => setVistaPrevia(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

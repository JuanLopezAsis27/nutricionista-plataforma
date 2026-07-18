"use client";

import { useState } from "react";
import { FileText, Image as ImagenIcono, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import { trpc } from "@/lib/trpc";
import { formatearFecha, formatearTamano } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";

/**
 * Sección "Archivos y registros" de la ficha: documentos sueltos del
 * paciente (consentimientos, fotos, estudios varios) guardados en el bucket.
 */
export function ArchivosPaciente({ pacienteId }: { pacienteId: string }) {
  const utils = trpc.useUtils();
  const archivos = trpc.archivos.obtenerDePaciente.useQuery({ pacienteId });
  const eliminar = trpc.archivos.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Archivo eliminado.");
      void utils.archivos.obtenerDePaciente.invalidate({ pacienteId });
    },
    onError: (error) => toast.error(error.message),
  });

  const [eliminando, setEliminando] = useState<ArchivoSalidaDto | null>(null);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Archivos y registros</h3>

      <SubidorArchivo
        contexto="paciente"
        pacienteId={pacienteId}
        accept="application/pdf,image/*,.doc,.docx"
        onSubido={() => void utils.archivos.obtenerDePaciente.invalidate({ pacienteId })}
      />

      {(archivos.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin archivos. Subí consentimientos, informes o cualquier documento
          del paciente.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {archivos.data!.map((archivo) => (
            <li key={archivo.id} className="flex items-center gap-3 p-3 text-sm">
              {archivo.mimeType.startsWith("image/") ? (
                <ImagenIcono className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/archivos/${archivo.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 truncate font-medium hover:text-primary"
                >
                  <span className="truncate">
                    {archivo.titulo ?? archivo.nombreOriginal}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <p className="text-xs text-muted-foreground">
                  {formatearTamano(archivo.tamanoBytes)} ·{" "}
                  {formatearFecha(archivo.creadoEn)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${archivo.nombreOriginal}`}
                onClick={() => setEliminando(archivo)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar archivo"
        descripcion={`¿Eliminar "${eliminando?.nombreOriginal}"? Se borra también del almacenamiento.`}
        cargando={eliminar.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminar.mutate(
              { id: eliminando.id },
              { onSuccess: () => setEliminando(null) },
            );
          }
        }}
        onCancelar={() => setEliminando(null)}
      />
    </div>
  );
}

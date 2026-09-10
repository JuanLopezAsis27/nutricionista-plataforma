"use client";

import { useState } from "react";
import { FileText, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import { trpc } from "@/lib/trpc";
import { formatearFecha, formatearTamano } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { FotoConVisor } from "@/componentes/comunes/FotoConVisor";

/**
 * Grupos en los que se parte la lista, en orden de aparición.
 *
 * La consulta trae TODO lo que cuelga de la ficha, y ahí se mezclan cosas de
 * origen muy distinto: lo que carga el profesional y las fotos que el paciente
 * manda a analizar desde el asistente (que quedan colgadas del paciente porque
 * no pertenecen a ninguna comida del diario). Sin separarlas, el profesional ve
 * un plato de comida entre los consentimientos sin saber de dónde salió.
 */
const GRUPOS = [
  {
    contexto: "paciente",
    titulo: "Documentos de la ficha",
    descripcion:
      "Consentimientos, informes y estudios cargados desde esta ficha.",
  },
  {
    contexto: "foto-comida",
    titulo: "Fotos de comidas del paciente",
    descripcion:
      "Las que subió desde el asistente para que la IA le analice el plato.",
  },
] as const;

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

  const todos = archivos.data ?? [];
  const conocidos = GRUPOS.map((grupo) => ({
    ...grupo,
    archivos: todos.filter((archivo) => archivo.contexto === grupo.contexto),
  }));
  const otros = todos.filter(
    (archivo) => !GRUPOS.some((grupo) => grupo.contexto === archivo.contexto),
  );
  const secciones = [
    ...conocidos,
    {
      contexto: "otros",
      titulo: "Otros archivos",
      descripcion: "Archivos vinculados al paciente desde otras secciones.",
      archivos: otros,
    },
  ].filter((seccion) => seccion.archivos.length > 0);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Archivos y registros</h3>

      <SubidorArchivo
        contexto="paciente"
        pacienteId={pacienteId}
        accept="application/pdf,image/*,.doc,.docx"
        onSubido={() =>
          void utils.archivos.obtenerDePaciente.invalidate({ pacienteId })
        }
      />

      {todos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin archivos. Subí consentimientos, informes o cualquier documento del
          paciente.
        </p>
      ) : (
        secciones.map((seccion) => (
          <section key={seccion.contexto} className="space-y-1.5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {seccion.titulo} ({seccion.archivos.length})
              </p>
              <p className="text-xs text-muted-foreground">
                {seccion.descripcion}
              </p>
            </div>
            <ul className="divide-y rounded-md border">
              {seccion.archivos.map((archivo) => (
                <FilaArchivo
                  key={archivo.id}
                  archivo={archivo}
                  onEliminar={() => setEliminando(archivo)}
                />
              ))}
            </ul>
          </section>
        ))
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

/**
 * Fila de un archivo. Las imágenes van con miniatura y se abren ampliadas en
 * un diálogo de la propia app; el resto (PDF, Word) sigue saliendo al visor
 * del navegador, que es quien sabe mostrarlos.
 */
function FilaArchivo({
  archivo,
  onEliminar,
}: {
  archivo: ArchivoSalidaDto;
  onEliminar: () => void;
}) {
  const nombre = archivo.titulo ?? archivo.nombreOriginal;
  const esImagen = archivo.mimeType.startsWith("image/");

  const datos = (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1 truncate font-medium">
        <span className="truncate">{nombre}</span>
        {!esImagen && <ExternalLink className="h-3 w-3 shrink-0" />}
      </span>
      <span className="block text-xs font-normal text-muted-foreground">
        {formatearTamano(archivo.tamanoBytes)} ·{" "}
        {formatearFecha(archivo.creadoEn)}
      </span>
    </span>
  );

  return (
    <li className="flex items-center gap-3 p-3 text-sm">
      {esImagen ? (
        <FotoConVisor
          archivoId={archivo.id}
          alt={nombre}
          className="h-12 w-12 shrink-0 border"
        >
          {datos}
        </FotoConVisor>
      ) : (
        <a
          href={`/api/archivos/${archivo.id}/ver`}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 flex-1 items-center gap-3 hover:text-primary"
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          {datos}
        </a>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Eliminar ${archivo.nombreOriginal}`}
        onClick={onEliminar}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}

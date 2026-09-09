"use client";

import { useState } from "react";
import { Star, Trash2, FileText } from "lucide-react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

type Adjunto = RecetaSalidaDto["fotos"][number];

/**
 * Los adjuntos que la receta YA tiene guardados: borrarlos y elegir la portada.
 *
 * Está separado de la carga de archivos nuevos porque son dos operaciones
 * distintas: lo que se sube todavía no existe para nadie y se descarta con
 * cerrar el formulario, mientras que borrar acá es definitivo y va contra el
 * servidor en el momento —sin esperar a "Guardar"—. Mezclarlos haría que la
 * misma «×» significara dos cosas.
 *
 * Pide la receta POR ID en vez de recibirla por prop, y eso es lo que hace que
 * la lista se actualice: el formulario la abre desde un `useState` del listado,
 * que es una copia congelada al momento de apretar "Editar". Invalidar la
 * caché refresca la consulta pero no esa copia, así que la foto borrada seguía
 * en pantalla hasta recargar. Leyendo de la query, cada mutación la refresca.
 */
export function AdjuntosGuardados({ recetaId }: { recetaId: string }) {
  const { obtenerPorId, eliminarArchivo, marcarFotoPrincipal } = useRecetas();
  const consulta = obtenerPorId({ id: recetaId });
  const [aBorrar, setABorrar] = useState<Adjunto | null>(null);

  const receta = consulta.data;
  if (!receta) return null;
  if (receta.fotos.length === 0 && receta.documentos.length === 0) return null;

  return (
    <div className="space-y-3">
      {receta.fotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fotos guardadas</p>
          <p className="text-xs text-muted-foreground">
            La marcada con la estrella es la que se ve en el recetario. Si no
            elegís ninguna, se usa la primera.
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {receta.fotos.map((foto) => {
              const esPrincipal = receta.fotoPrincipalId === foto.id;
              return (
                <li
                  key={foto.id}
                  className={cn(
                    "group relative overflow-hidden rounded-md border",
                    esPrincipal && "ring-2 ring-primary",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/archivos/${foto.id}/ver`}
                    alt={foto.nombreOriginal}
                    className="h-28 w-full object-cover"
                  />
                  {esPrincipal && (
                    <Badge className="absolute left-1.5 top-1.5 gap-1">
                      <Star className="h-3 w-3" /> Principal
                    </Badge>
                  )}
                  <div className="flex items-center justify-between gap-1 p-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={esPrincipal || marcarFotoPrincipal.isPending}
                      title={
                        esPrincipal
                          ? "Ya es la principal"
                          : "Usar como foto principal"
                      }
                      onClick={() =>
                        marcarFotoPrincipal.mutate({
                          recetaId: receta.id,
                          fotoId: foto.id,
                        })
                      }
                    >
                      <Star className="h-3.5 w-3.5" />
                      {esPrincipal ? "Principal" : "Usar"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Borrar ${foto.nombreOriginal}`}
                      disabled={eliminarArchivo.isPending}
                      onClick={() => setABorrar(foto)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {receta.documentos.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Documentos guardados</p>
          <ul className="space-y-1">
            {receta.documentos.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <a
                  href={`/api/archivos/${doc.id}/ver`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 hover:underline"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.nombreOriginal}</span>
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Borrar ${doc.nombreOriginal}`}
                  disabled={eliminarArchivo.isPending}
                  onClick={() => setABorrar(doc)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ModalConfirmacion
        abierto={Boolean(aBorrar)}
        titulo="Borrar el archivo"
        descripcion={`¿Borrar «${aBorrar?.nombreOriginal}»? Se elimina de la receta y del almacenamiento. Esta acción no se puede deshacer.`}
        cargando={eliminarArchivo.isPending}
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (!aBorrar) return;
          eliminarArchivo.mutate(
            { recetaId: receta.id, archivoId: aBorrar.id },
            { onSuccess: () => setABorrar(null) },
          );
        }}
      />
    </div>
  );
}

"use client";

import { useBiblioteca } from "@/lib/hooks/useBiblioteca";
import {
  NavegadorCarpetas as Navegador,
  type CarpetaNavegable,
} from "@/componentes/comunes/NavegadorCarpetas";

interface Props {
  /** Carpeta abierta, o null en la raíz. */
  carpetaId: string | null;
  onAbrir: (carpetaId: string | null) => void;
  busqueda: string;
  onBuscar: (texto: string) => void;
}

/**
 * Las carpetas de la biblioteca: el mismo navegador que usan los planes y el
 * recetario, atado a `useBiblioteca`. Se navegan IGUAL a propósito, así que el
 * dibujo vive una sola vez en `comunes/NavegadorCarpetas` y acá queda solo de
 * dónde salen las carpetas.
 */
export function NavegadorCarpetas({
  carpetaId,
  onAbrir,
  busqueda,
  onBuscar,
}: Props) {
  const {
    grupos: listarGrupos,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
    mover,
  } = useBiblioteca();
  const consulta = listarGrupos();

  const carpetas: CarpetaNavegable[] = (consulta.data ?? []).map((carpeta) => ({
    id: carpeta.id,
    nombre: carpeta.nombre,
    descripcion: carpeta.descripcion,
    cantidad: carpeta.cantidadMateriales,
  }));

  return (
    <Navegador
      carpetas={carpetas}
      cargando={consulta.isLoading}
      carpetaId={carpetaId}
      onAbrir={onAbrir}
      busqueda={busqueda}
      onBuscar={onBuscar}
      singular="material"
      plural="materiales"
      ejemplos="Guías de inicio, Deportistas, Julia Pérez…"
      guardando={crearGrupo.isPending || actualizarGrupo.isPending}
      eliminando={eliminarGrupo.isPending}
      onCrear={(datos, alTerminar) =>
        crearGrupo.mutate(
          {
            nombre: datos.nombre,
            descripcion: datos.descripcion.trim() || null,
          },
          { onSuccess: alTerminar },
        )
      }
      onActualizar={(id, datos, alTerminar) =>
        actualizarGrupo.mutate(
          {
            id,
            nombre: datos.nombre,
            descripcion: datos.descripcion.trim() || null,
          },
          { onSuccess: alTerminar },
        )
      }
      onSoltar={(materialId, grupoId) => mover.mutate({ materialId, grupoId })}
      onEliminar={(id, alTerminar) =>
        eliminarGrupo.mutate({ id }, { onSuccess: alTerminar })
      }
    />
  );
}

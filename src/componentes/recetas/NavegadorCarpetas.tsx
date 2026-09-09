"use client";

import { useRecetas } from "@/lib/hooks/useRecetas";
import {
  NavegadorCarpetas as Navegador,
  type CarpetaNavegable,
} from "@/componentes/comunes/NavegadorCarpetas";

interface Props {
  /** Carpeta abierta, o null en la raíz. */
  carpetaId: string | null;
  onAbrir: (carpetaId: string | null) => void;
}

/**
 * Las carpetas del recetario: el mismo navegador que usan los planes, atado a
 * `useRecetas`.
 *
 * Se navegan IGUAL a propósito —quien aprendió a ordenar sus planes ya sabe
 * ordenar sus recetas—, así que el dibujo vive una sola vez en
 * `comunes/NavegadorCarpetas` y acá queda solo de dónde salen las carpetas.
 */
export function NavegadorCarpetas({ carpetaId, onAbrir }: Props) {
  const {
    grupos: listarGrupos,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
  } = useRecetas();
  const consulta = listarGrupos();

  const carpetas: CarpetaNavegable[] = (consulta.data ?? []).map((carpeta) => ({
    id: carpeta.id,
    nombre: carpeta.nombre,
    descripcion: carpeta.descripcion,
    cantidad: carpeta.cantidadRecetas,
  }));

  return (
    <Navegador
      carpetas={carpetas}
      cargando={consulta.isLoading}
      carpetaId={carpetaId}
      onAbrir={onAbrir}
      singular="receta"
      plural="recetas"
      ejemplos="Desayunos, Sin TACC, Julia Pérez…"
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
      onEliminar={(id, alTerminar) =>
        eliminarGrupo.mutate({ id }, { onSuccess: alTerminar })
      }
    />
  );
}

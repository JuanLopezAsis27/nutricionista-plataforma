"use client";

import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import {
  NavegadorCarpetas,
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
 * Las carpetas de planificaciones deportivas: el navegador compartido (el de
 * planes, recetario y biblioteca) atado a este módulo. La carpeta de cada
 * paciente se arma sola al crearle una planificación desde su ficha.
 */
export function NavegadorCarpetasPlanificacion({
  carpetaId,
  onAbrir,
  busqueda,
  onBuscar,
}: Props) {
  const { grupos, crearGrupo, actualizarGrupo, eliminarGrupo, mover } =
    usePlanificacionDeportiva();
  const consulta = grupos();

  const carpetas: CarpetaNavegable[] = (consulta.data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    cantidad: c.cantidadPlanificaciones,
  }));

  return (
    <NavegadorCarpetas
      carpetas={carpetas}
      cargando={consulta.isLoading}
      carpetaId={carpetaId}
      onAbrir={onAbrir}
      busqueda={busqueda}
      onBuscar={onBuscar}
      singular="planificación"
      plural="planificaciones"
      ejemplos="Julia Pérez, Maratones, Trail de montaña…"
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
      onSoltar={(planificacionId, grupoId) =>
        mover.mutate({ planificacionId, grupoId })
      }
      onEliminar={(id, alTerminar) =>
        eliminarGrupo.mutate({ id }, { onSuccess: alTerminar })
      }
    />
  );
}

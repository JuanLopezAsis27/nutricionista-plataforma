"use client";

import { usePlanes } from "@/lib/hooks/usePlanes";
import {
  NavegadorCarpetas as Navegador,
  type CarpetaNavegable,
} from "@/componentes/comunes/NavegadorCarpetas";

export { esquema } from "@/componentes/comunes/NavegadorCarpetas";

interface Props {
  /** Carpeta abierta, o null en la raíz. */
  carpetaId: string | null;
  onAbrir: (carpetaId: string | null) => void;
}

/**
 * Las carpetas de planes: el navegador compartido atado a `usePlanes`.
 *
 * El dibujo y la interacción viven en `comunes/NavegadorCarpetas`, que también
 * usa el recetario. Acá queda lo único propio de los planes: de dónde salen las
 * carpetas.
 *
 * Las carpetas son SOLO de los planes. Las plantillas no se guardan en carpetas
 * —son moldes de los que se saca un plan, y meterlas en la carpeta de un
 * paciente las vuelve imposibles de encontrar desde otro—, así que el número de
 * cada carpeta es siempre el de planes.
 */
export function NavegadorCarpetas({ carpetaId, onAbrir }: Props) {
  const {
    grupos: listarGrupos,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
  } = usePlanes();
  const consulta = listarGrupos();

  const carpetas: CarpetaNavegable[] = (consulta.data ?? []).map((carpeta) => ({
    id: carpeta.id,
    nombre: carpeta.nombre,
    descripcion: carpeta.descripcion,
    cantidad: carpeta.cantidadPlanes,
  }));

  return (
    <Navegador
      carpetas={carpetas}
      cargando={consulta.isLoading}
      carpetaId={carpetaId}
      onAbrir={onAbrir}
      singular="plan"
      plural="planes"
      ejemplos="Julia Pérez, Descenso, Deportistas…"
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

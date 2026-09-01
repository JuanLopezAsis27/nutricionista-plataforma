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
  /** Qué se está listando: decide qué número muestra cada carpeta. */
  esPlantilla: boolean;
}

/**
 * Las carpetas de planes: el navegador compartido atado a `usePlanes`.
 *
 * El dibujo y la interacción viven en `comunes/NavegadorCarpetas`, que también
 * usa el recetario. Acá queda lo único propio de los planes: de dónde salen las
 * carpetas y qué número muestra cada una, que depende de si la pestaña está
 * listando planes o plantillas —una carpeta con 3 planes y ninguna plantilla
 * tiene que verse vacía en la pestaña de plantillas, no decir «3» y abrirse sin
 * nada—.
 */
export function NavegadorCarpetas({ carpetaId, onAbrir, esPlantilla }: Props) {
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
    cantidad: esPlantilla ? carpeta.cantidadPlantillas : carpeta.cantidadPlanes,
  }));

  return (
    <Navegador
      carpetas={carpetas}
      cargando={consulta.isLoading}
      carpetaId={carpetaId}
      onAbrir={onAbrir}
      singular={esPlantilla ? "plantilla" : "plan"}
      plural={esPlantilla ? "plantillas" : "planes"}
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

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/**
 * Recetas predeterminadas de la plataforma (migración 82).
 *
 * El SUPERADMIN las gestiona (`superadmin.*`); un consultorio las lista y las
 * COPIA a su recetario (`recetas.*`). Cada pantalla usa la mitad que le toca.
 */
export function useRecetasBase() {
  const invalidar = useInvalidar();

  const alTerminar = (mensaje: string) => ({
    onSuccess: () => {
      toast.success(mensaje);
      invalidar();
    },
    onError: (error: unknown) => avisarError(error),
  });

  const crear = trpc.superadmin.crearRecetaBase.useMutation(
    alTerminar("Receta agregada al catálogo."),
  );
  const actualizar = trpc.superadmin.actualizarRecetaBase.useMutation(
    alTerminar("Receta actualizada."),
  );
  const eliminar = trpc.superadmin.eliminarRecetaBase.useMutation(
    alTerminar("Receta eliminada del catálogo."),
  );
  // Sin toast propio: quien copia decide qué decir (el recetario avisa, el
  // plan la deja elegida sin interrumpir).
  const copiar = trpc.recetas.copiarRecetaBase.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => avisarError(error),
  });

  return {
    /** Listado para el SUPERADMIN. */
    listarAdmin: trpc.superadmin.listarRecetasBase.useQuery,
    /** Listado para un consultorio. */
    listar: trpc.recetas.listarRecetasBase.useQuery,
    /** Las etiquetas del catálogo, para los filtros de un consultorio. */
    etiquetas: trpc.recetas.etiquetasRecetasBase.useQuery,
    crear,
    actualizar,
    eliminar,
    copiar,
  };
}

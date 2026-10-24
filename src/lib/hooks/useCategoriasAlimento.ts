"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";
import type { CategoriaAlimentoSalidaDto } from "@/aplicacion/dtos/categoriaAlimento.dto";
import type { OrigenAlimentos } from "@/lib/hooks/useAlimentosPropios";

/**
 * Las categorías de alimento de una lista (migración 93), con su gestión.
 *
 *  - `consultorio`: las predeterminadas y las propias; se gestionan las
 *    propias.
 *  - `predeterminados`: la lista de la plataforma vista desde un consultorio;
 *    sus alimentos solo llevan predeterminadas.
 *  - `plataforma`: las predeterminadas, que gestiona el SUPERADMIN (con orden).
 *
 * Las queries y mutaciones de las dos listas se declaran siempre —los hooks no
 * pueden ser condicionales— y se usa la del origen pedido.
 */
export function useCategoriasAlimento(origen: OrigenAlimentos = "consultorio") {
  const invalidar = useInvalidar();
  const deLaPlataforma = origen === "plataforma";

  const delConsultorio = trpc.nutricion.categoriasAlimento.useQuery(undefined, {
    enabled: !deLaPlataforma,
    staleTime: 60_000,
  });
  const deLaBase = trpc.superadmin.categoriasAlimentoBase.useQuery(undefined, {
    enabled: deLaPlataforma,
    staleTime: 60_000,
  });
  const consulta = deLaPlataforma ? deLaBase : delConsultorio;
  const todas: CategoriaAlimentoSalidaDto[] = consulta.data ?? [];
  // Un alimento de la plataforma no lleva categorías de un consultorio.
  const categorias =
    origen === "predeterminados" ? todas.filter((c) => !c.propia) : todas;

  const opciones = (mensaje: string) => ({
    onSuccess: () => {
      toast.success(mensaje);
      invalidar();
    },
    onError: (error: unknown) => avisarError(error),
  });

  const crearPropia = trpc.nutricion.crearCategoriaAlimento.useMutation(
    opciones("Categoría creada."),
  );
  const crearBase = trpc.superadmin.crearCategoriaAlimentoBase.useMutation(
    opciones("Categoría creada."),
  );
  const renombrarPropia = trpc.nutricion.renombrarCategoriaAlimento.useMutation(
    opciones("Categoría renombrada."),
  );
  const renombrarBase =
    trpc.superadmin.renombrarCategoriaAlimentoBase.useMutation(
      opciones("Categoría renombrada."),
    );
  const eliminarPropia = trpc.nutricion.eliminarCategoriaAlimento.useMutation(
    opciones("Categoría eliminada."),
  );
  const eliminarBase =
    trpc.superadmin.eliminarCategoriaAlimentoBase.useMutation(
      opciones("Categoría eliminada."),
    );
  const mover = trpc.superadmin.moverCategoriaAlimentoBase.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => avisarError(error),
  });

  return {
    categorias,
    cargando: consulta.isLoading,
    /** Las que se pueden editar desde acá: las propias, o todas en la plataforma. */
    editables: deLaPlataforma ? categorias : categorias.filter((c) => c.propia),
    crear: deLaPlataforma ? crearBase : crearPropia,
    renombrar: deLaPlataforma ? renombrarBase : renombrarPropia,
    eliminar: deLaPlataforma ? eliminarBase : eliminarPropia,
    /** Solo en la plataforma: las propias van por nombre. */
    mover: deLaPlataforma ? mover : null,
  };
}

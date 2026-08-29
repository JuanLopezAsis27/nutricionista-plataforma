"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de objetivos y estrategias. */
export function useObjetivos() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.objetivos.crear.useMutation({
    onSuccess: () => {
      toast.success("Objetivo creado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.objetivos.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Objetivo actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const cambiarEstado = trpc.objetivos.cambiarEstado.useMutation({
    onSuccess: () => {
      toast.success("Estado del objetivo actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.objetivos.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Objetivo eliminado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const agregarEstrategia = trpc.objetivos.agregarEstrategia.useMutation({
    onSuccess: () => {
      toast.success("Estrategia agregada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const cambiarEstadoEstrategia = trpc.objetivos.cambiarEstadoEstrategia.useMutation({
    onSuccess: () => {
      toast.success("Estado de la estrategia actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminarEstrategia = trpc.objetivos.eliminarEstrategia.useMutation({
    onSuccess: () => {
      toast.success("Estrategia eliminada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    dePaciente: trpc.objetivos.obtenerDePaciente.useQuery,
    mios: trpc.objetivos.mios.useQuery,
    historial: trpc.objetivos.historial.useQuery,
    crear,
    actualizar,
    cambiarEstado,
    eliminar,
    agregarEstrategia,
    cambiarEstadoEstrategia,
    eliminarEstrategia,
  };
}

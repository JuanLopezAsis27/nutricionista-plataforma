"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC del módulo deportivo (perfil + competencias). */
export function useDeportivo() {
  const invalidar = useInvalidar();

  const guardarPerfil = trpc.deportivo.guardarPerfil.useMutation({
    onSuccess: () => {
      toast.success("Perfil deportivo guardado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const crearCompetencia = trpc.deportivo.crearCompetencia.useMutation({
    onSuccess: () => {
      toast.success("Competencia agregada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizarCompetencia =
    trpc.deportivo.actualizarCompetencia.useMutation({
      onSuccess: () => {
        toast.success("Competencia actualizada.");
        invalidar();
      },
      onError: (error) => toast.error(error.message),
    });

  const eliminarCompetencia = trpc.deportivo.eliminarCompetencia.useMutation({
    onSuccess: () => {
      toast.success("Competencia eliminada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    obtenerPerfil: trpc.deportivo.obtenerPerfil.useQuery,
    listarCompetencias: trpc.deportivo.listarCompetencias.useQuery,
    miPerfil: trpc.deportivo.miPerfil.useQuery,
    misCompetencias: trpc.deportivo.misCompetencias.useQuery,
    guardarPerfil,
    crearCompetencia,
    actualizarCompetencia,
    eliminarCompetencia,
  };
}

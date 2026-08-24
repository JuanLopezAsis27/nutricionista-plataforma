"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Encapsula las llamadas tRPC del recetario. */
export function useRecetas() {
  const utils = trpc.useUtils();
  const invalidar = () => utils.recetas.invalidate();

  const crear = trpc.recetas.crear.useMutation({
    onSuccess: () => {
      toast.success("Receta creada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.recetas.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Receta actualizada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.recetas.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Receta eliminada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const asignar = trpc.recetas.asignarAPaciente.useMutation({
    onSuccess: () => {
      toast.success("Receta compartida con el paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const desasignar = trpc.recetas.desasignarDePaciente.useMutation({
    onSuccess: () => {
      toast.success("Receta quitada del paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listar: trpc.recetas.obtenerTodas.useQuery,
    listarPaginado: trpc.recetas.listarPaginado.useQuery,
    obtenerPorId: trpc.recetas.obtenerPorId.useQuery,
    pacientesAsignados: trpc.recetas.pacientesAsignados.useQuery,
    delPaciente: trpc.recetas.obtenerDelPaciente.useQuery,
    misRecetas: trpc.recetas.obtenerMisRecetas.useQuery,
    crear,
    actualizar,
    eliminar,
    asignar,
    desasignar,
  };
}

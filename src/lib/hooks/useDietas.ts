"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Encapsula todas las llamadas tRPC de dietas.
 */
export function useDietas() {
  const utils = trpc.useUtils();
  const invalidar = () => {
    utils.dietas.invalidate();
    utils.pacientes.invalidate();
  };

  const crear = trpc.dietas.crear.useMutation({
    onSuccess: () => {
      toast.success("Dieta creada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.dietas.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Dieta actualizada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.dietas.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Dieta eliminada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const asignar = trpc.dietas.asignarAPaciente.useMutation({
    onSuccess: () => {
      toast.success("Dieta asignada al paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listar: trpc.dietas.obtenerTodas.useQuery,
    obtenerPorId: trpc.dietas.obtenerPorId.useQuery,
    miDieta: trpc.dietas.obtenerMiDieta.useQuery,
    delPaciente: trpc.dietas.obtenerDelPaciente.useQuery,
    crear,
    actualizar,
    eliminar,
    asignar,
  };
}

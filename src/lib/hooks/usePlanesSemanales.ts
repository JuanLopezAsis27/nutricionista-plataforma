"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de planes semanales de referencia. */
export function usePlanesSemanales() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.planesSemanales.crear.useMutation({
    onSuccess: () => {
      toast.success("Plan semanal creado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.planesSemanales.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Plan semanal actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.planesSemanales.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Plan semanal eliminado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const asignar = trpc.planesSemanales.asignarAPaciente.useMutation({
    onSuccess: () => {
      toast.success("Plan semanal asignado al paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const desasignar = trpc.planesSemanales.desasignarDePaciente.useMutation({
    onSuccess: () => {
      toast.success("Plan semanal finalizado para el paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listar: trpc.planesSemanales.listar.useQuery,
    obtenerPorId: trpc.planesSemanales.obtenerPorId.useQuery,
    delPaciente: trpc.planesSemanales.obtenerDelPaciente.useQuery,
    historialDelPaciente:
      trpc.planesSemanales.obtenerHistorialDePaciente.useQuery,
    pacientesDelPlan: trpc.planesSemanales.obtenerPacientesDePlan.useQuery,
    crear,
    actualizar,
    eliminar,
    asignar,
    desasignar,
  };
}

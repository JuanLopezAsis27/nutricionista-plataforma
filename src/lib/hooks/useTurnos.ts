"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Encapsula todas las llamadas tRPC de turnos.
 * Las mutations invalidan tanto turnos como pacientes (el detalle del
 * paciente muestra sus turnos).
 */
export function useTurnos() {
  const utils = trpc.useUtils();
  const invalidar = () => {
    utils.turnos.invalidate();
    utils.pacientes.invalidate();
  };

  const agendar = trpc.turnos.agendar.useMutation({
    onSuccess: () => {
      toast.success("Turno agendado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizarEstado = trpc.turnos.actualizarEstado.useMutation({
    onSuccess: () => {
      toast.success("Estado del turno actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelar = trpc.turnos.cancelar.useMutation({
    onSuccess: () => {
      toast.success("Turno cancelado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const reprogramar = trpc.turnos.reprogramar.useMutation({
    onSuccess: () => {
      toast.success("Turno reprogramado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const registrarCobro = trpc.turnos.registrarCobro.useMutation({
    onSuccess: () => {
      toast.success("Cobro actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listar: trpc.turnos.obtenerTodos.useQuery,
    porPaciente: trpc.turnos.obtenerPorPaciente.useQuery,
    agendar,
    actualizarEstado,
    cancelar,
    reprogramar,
    registrarCobro,
  };
}

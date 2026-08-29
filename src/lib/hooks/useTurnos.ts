"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Encapsula todas las llamadas tRPC de turnos.
 * Las mutations invalidan tanto turnos como pacientes (el detalle del
 * paciente muestra sus turnos).
 */
export function useTurnos() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

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

  /**
   * Borrado definitivo, distinto de cancelar: saca el turno de la agenda para
   * siempre. Solo el dominio decide si corresponde (cancelado y sin cobro).
   */
  const eliminar = trpc.turnos.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Turno borrado de la agenda.");
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
    eliminar,
    reprogramar,
    registrarCobro,
  };
}

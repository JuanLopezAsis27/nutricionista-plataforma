"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

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
    onError: (error) => avisarError(error),
  });

  const actualizarEstado = trpc.turnos.actualizarEstado.useMutation({
    onSuccess: () => {
      toast.success("Estado del turno actualizado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const cancelar = trpc.turnos.cancelar.useMutation({
    onSuccess: () => {
      toast.success("Turno cancelado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
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
    onError: (error) => avisarError(error),
  });

  const reprogramar = trpc.turnos.reprogramar.useMutation({
    onSuccess: () => {
      toast.success("Turno reprogramado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const registrarCobro = trpc.turnos.registrarCobro.useMutation({
    onSuccess: () => {
      toast.success("Cobro actualizado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  /**
   * Los lotes no muestran su propio toast: el resultado dice cuántos salieron
   * y cuáles no, y armar ese mensaje con los nombres es de la pantalla, que
   * es la que tiene los turnos a mano.
   */
  const actualizarEstadoLote = trpc.turnos.actualizarEstadoLote.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => avisarError(error),
  });

  const registrarCobroLote = trpc.turnos.registrarCobroLote.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => avisarError(error),
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
    actualizarEstadoLote,
    registrarCobroLote,
  };
}

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de seguimiento (suplementos, alertas, informes). */
export function useSeguimiento() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const registrarSuplemento = trpc.seguimiento.registrarSuplemento.useMutation({
    onSuccess: () => {
      toast.success("Suplemento indicado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizarSuplemento =
    trpc.seguimiento.actualizarSuplemento.useMutation({
      onSuccess: () => {
        toast.success("Suplemento actualizado.");
        invalidar();
      },
      onError: (error) => toast.error(error.message),
    });

  const eliminarSuplemento = trpc.seguimiento.eliminarSuplemento.useMutation({
    onSuccess: () => {
      toast.success("Suplemento eliminado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const resolverAlerta = trpc.seguimiento.resolverAlerta.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => toast.error(error.message),
  });

  const generarAlertas = trpc.seguimiento.generarAlertas.useMutation({
    onSuccess: (resultado) => {
      toast.success(
        resultado.generadas > 0
          ? `${resultado.generadas} alerta(s) nueva(s).`
          : "Sin novedades: no hay alertas nuevas.",
      );
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    suplementosDelPaciente: trpc.seguimiento.suplementosDelPaciente.useQuery,
    misSuplementos: trpc.seguimiento.misSuplementos.useQuery,
    alertasPendientes: trpc.seguimiento.alertasPendientes.useQuery,
    contarAlertas: trpc.seguimiento.contarAlertas.useQuery,
    informeProgreso: trpc.seguimiento.informeProgreso.useQuery,
    informeHabitos: trpc.seguimiento.informeHabitos.useQuery,
    registrarSuplemento,
    actualizarSuplemento,
    eliminarSuplemento,
    resolverAlerta,
    generarAlertas,
  };
}

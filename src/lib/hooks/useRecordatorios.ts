"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de Recordatorios de turno. */
export function useRecordatorios() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const guardarConfiguracion =
    trpc.recordatorios.guardarConfiguracion.useMutation({
      onSuccess: () => {
        toast.success("Configuración de recordatorios guardada.");
        invalidar();
      },
      onError: (error) => toast.error(error.message),
    });

  const crearPlantilla = trpc.recordatorios.crearPlantilla.useMutation({
    onSuccess: () => {
      toast.success("Plantilla creada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizarPlantilla =
    trpc.recordatorios.actualizarPlantilla.useMutation({
      onSuccess: () => {
        toast.success("Plantilla guardada.");
        invalidar();
      },
      onError: (error) => toast.error(error.message),
    });

  const eliminarPlantilla = trpc.recordatorios.eliminarPlantilla.useMutation({
    onSuccess: () => {
      toast.success("Plantilla eliminada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const enviarMasivo = trpc.recordatorios.enviarMasivo.useMutation({
    onSuccess: (r) => {
      // El resumen distingue los cuatro desenlaces en vez de decir "listo":
      // omitidos y fallidos son justamente lo que hay que mirar.
      const partes = [
        r.enviados > 0 ? `${r.enviados} enviado(s)` : null,
        r.preparados > 0 ? `${r.preparados} chat(s) para abrir` : null,
        r.emailsEnviados > 0 ? `${r.emailsEnviados} email(s)` : null,
        r.omitidos > 0 ? `${r.omitidos} omitido(s)` : null,
        r.fallidos > 0 ? `${r.fallidos} con error` : null,
      ].filter(Boolean);
      const mensaje =
        partes.length > 0 ? partes.join(" · ") : "No había nada para enviar.";
      if (r.fallidos > 0) toast.warning(mensaje);
      else toast.success(mensaje);
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const enviarProgramados = trpc.recordatorios.enviarProgramados.useMutation({
    onSuccess: (r) => {
      if (!r.corrio) {
        toast.info(r.motivo ?? "No había recordatorios para enviar.");
      } else if (r.enviados === 0) {
        // Distingue "no había a quién avisarle" de "el medio está apagado":
        // son dos situaciones distintas y solo una es un problema.
        const apagados = [r.whatsapp, r.email]
          .filter((medio) => !medio.corrio)
          .map((medio) => medio.motivo)
          .filter(Boolean);
        toast.info(
          apagados.length > 0
            ? apagados.join(" ")
            : "No había recordatorios pendientes para hoy.",
        );
      } else {
        const detalle = [
          r.whatsapp.enviados > 0
            ? `${r.whatsapp.enviados} por WhatsApp`
            : null,
          r.email.enviados > 0 ? `${r.email.enviados} por email` : null,
        ].filter(Boolean);
        toast.success(`Recordatorios enviados: ${detalle.join(" y ")}.`);
      }
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const enviarIndividual = trpc.recordatorios.enviarIndividual.useMutation({
    onSuccess: (r) => {
      const detalle = r.detalles[0];
      if (detalle?.estado === "FALLIDO")
        toast.error(detalle.motivo ?? "No se pudo enviar.");
      else if (detalle?.estado === "OMITIDO")
        toast.info(detalle.motivo ?? "No se envió.");
      else if (detalle?.emailEnviado)
        toast.success("Recordatorio enviado por WhatsApp y email.");
      else toast.success("Recordatorio enviado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const confirmarEnvio = trpc.recordatorios.confirmarEnvio.useMutation({
    onSuccess: (recordatorio) => {
      toast.success(
        recordatorio.estado === "DESCARTADO"
          ? "Recordatorio descartado."
          : "Recordatorio marcado como enviado.",
      );
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    configuracion: trpc.recordatorios.configuracion.useQuery,
    plantillas: trpc.recordatorios.listarPlantillas.useQuery,
    turnosParaRecordar: trpc.recordatorios.turnosParaRecordar.useQuery,
    seguimiento: trpc.recordatorios.seguimiento.useQuery,
    pendientes: trpc.recordatorios.pendientes.useQuery,
    vistaPrevia: trpc.recordatorios.vistaPrevia.useQuery,
    guardarConfiguracion,
    crearPlantilla,
    actualizarPlantilla,
    eliminarPlantilla,
    enviarMasivo,
    enviarProgramados,
    enviarIndividual,
    confirmarEnvio,
  };
}

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Suscribe la sesión al flujo de eventos en tiempo real (SSE) y reacciona:
 * invalida las queries afectadas para que la UI se actualice sola y muestra
 * un aviso breve. Se monta una vez por layout (ver <TiempoReal/>).
 */
export function useTiempoReal() {
  const utils = trpc.useUtils();

  trpc.tiempoReal.suscribirse.useSubscription(undefined, {
    onData: (evento) => {
      switch (evento.tipo) {
        case "mensaje.nuevo":
          void utils.mensajeria.invalidate();
          void utils.notificaciones.centro.invalidate();
          toast("Nuevo mensaje", { description: "Tenés un mensaje sin leer." });
          break;
        case "whatsapp.mensaje":
          void utils.whatsapp.hiloDe.invalidate();
          toast("Nuevo mensaje de WhatsApp", {
            description: "Un paciente te escribió por WhatsApp.",
          });
          break;
        case "alerta.nueva":
          void utils.seguimiento.contarAlertas.invalidate();
          void utils.seguimiento.alertasPendientes.invalidate();
          void utils.notificaciones.centro.invalidate();
          break;
        case "correo.enviado":
          // Aviso de correo (recordatorios): refresca la campana del nutri.
          void utils.notificaciones.centro.invalidate();
          break;
        default:
          break;
      }
    },
  });
}

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { TIPO_RECONEXION } from "@/dominio/servicios/IBusEventos";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Suscribe la sesión al flujo de eventos en tiempo real (SSE) y reacciona:
 * invalida las queries afectadas para que la UI se actualice sola y muestra
 * un aviso breve. Se monta una vez por layout (ver <TiempoReal/>).
 */
export function useTiempoReal() {
  const utils = trpc.useUtils();
  const invalidarTodo = useInvalidar();

  trpc.tiempoReal.suscribirse.useSubscription(undefined, {
    onData: (evento) => {
      switch (evento.tipo) {
        case "mensaje.nuevo":
          void utils.mensajeria.invalidate();
          void utils.notificaciones.centro.invalidate();
          toast("Nuevo mensaje", { description: "Tenés un mensaje sin leer." });
          break;
        case "whatsapp.mensaje":
          // No alcanza con el hilo: la respuesta del paciente también mueve el
          // estado de sus recordatorios (RESPONDIDO, y CONFIRMADO si dijo que
          // sí), que es lo que se mira en el seguimiento.
          invalidarTodo();
          toast("Nuevo mensaje de WhatsApp", {
            description: "Un paciente te escribió por WhatsApp.",
          });
          break;
        case "alerta.nueva":
          void utils.seguimiento.contarAlertas.invalidate();
          void utils.seguimiento.alertasPendientes.invalidate();
          void utils.notificaciones.centro.invalidate();
          break;
        case TIPO_RECONEXION:
          // El bus estuvo caído y volvió. LISTEN/NOTIFY no reintrega lo que se
          // publicó en el medio, así que lo que hay en pantalla puede estar
          // desactualizado: se invalida todo y se vuelve a pedir. Sin aviso al
          // usuario — es una recuperación interna, no algo que deba accionar.
          void utils.invalidate();
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

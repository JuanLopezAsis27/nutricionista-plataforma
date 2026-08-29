"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Check, CheckCheck, AlertTriangle, MessageCircle } from "lucide-react";
import type { MensajeWhatsappSalidaDto } from "@/aplicacion/dtos/whatsapp.dto";
import { useWhatsapp } from "@/lib/hooks/useWhatsapp";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { Skeleton } from "@/componentes/ui/skeleton";

function hora(fecha: Date | string): string {
  return new Date(fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Hilo de WhatsApp con un paciente, dentro de la app.
 *
 * Solo existe con la Cloud API conectada. Fuera de la ventana de 24 h desde el
 * último mensaje del paciente, Meta rechaza el texto libre: se avisa antes en
 * vez de dejar que el envío falle.
 */
export function HiloWhatsapp({ pacienteId }: { pacienteId: string }) {
  const { hiloDe, enviarMensaje } = useWhatsapp();
  const hilo = hiloDe({ pacienteId });
  const [borrador, setBorrador] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

  const mensajes = hilo.data?.mensajes ?? [];
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  if (hilo.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!hilo.data?.conectado) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">WhatsApp no está conectado</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cargá las credenciales de la API oficial en Integraciones → WhatsApp para ver acá los
          mensajes con tus pacientes. Mientras tanto los recordatorios salen como enlaces que
          abrís vos, desde Recordatorios.
        </p>
      </div>
    );
  }

  const ventanaAbierta = hilo.data.ventanaAbierta;

  function enviar() {
    const cuerpo = borrador.trim();
    if (!cuerpo || enviarMensaje.isPending) return;
    enviarMensaje.mutate({ pacienteId, cuerpo }, { onSuccess: () => setBorrador("") });
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {mensajes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no hay mensajes de WhatsApp con este paciente.
          </p>
        ) : (
          mensajes.map((mensaje) => <Burbuja key={mensaje.id} mensaje={mensaje} />)
        )}
        <div ref={finRef} />
      </div>

      {!ventanaAbierta && (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Pasaron más de 24 h desde el último mensaje del paciente. WhatsApp solo permite
            escribirle con una plantilla aprobada; un texto libre va a ser rechazado.
          </span>
        </p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          placeholder="Escribí un mensaje…"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <Button
          size="icon"
          title="Enviar por WhatsApp"
          disabled={borrador.trim() === "" || enviarMensaje.isPending}
          onClick={enviar}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Burbuja({ mensaje }: { mensaje: MensajeWhatsappSalidaDto }) {
  const mio = mensaje.direccion === "SALIENTE";
  return (
    <div className={cn("flex", mio ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
          mio ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{mensaje.cuerpo}</p>
        <p
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            mio ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {hora(mensaje.creadoEn)}
          {mio && <IconoEstado estado={mensaje.estado} />}
        </p>
        {mensaje.error && (
          <p className="mt-1 text-[10px] text-destructive">{mensaje.error}</p>
        )}
      </div>
    </div>
  );
}

/** Los mismos tildes que muestra WhatsApp: uno enviado, dos entregado, azul leído. */
function IconoEstado({ estado }: { estado: MensajeWhatsappSalidaDto["estado"] }) {
  if (estado === "FALLIDO") return <AlertTriangle className="h-3 w-3 text-destructive" />;
  if (estado === "LEIDO") return <CheckCheck className="h-3 w-3 text-sky-300" />;
  if (estado === "ENTREGADO") return <CheckCheck className="h-3 w-3" />;
  if (estado === "ENVIADO") return <Check className="h-3 w-3" />;
  return null;
}
